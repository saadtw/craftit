import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { normalizeCustomizationTypes } from "@/lib/customization";

function resolveCustomizationConfig(payload, existingProduct = null) {
  const customizationOptions =
    payload.customizationOptions !== undefined
      ? Boolean(payload.customizationOptions)
      : Boolean(existingProduct?.customizationOptions);

  const incomingCapabilities = payload.customizationCapabilities || {};
  const existingCapabilities = existingProduct?.customizationCapabilities || {};

  const rawAllowedTypes =
    incomingCapabilities.allowedTypes !== undefined
      ? incomingCapabilities.allowedTypes
      : existingCapabilities.allowedTypes || [];

  const allowedTypes = normalizeCustomizationTypes(rawAllowedTypes);

  const rawMinCustomizationQuantity =
    incomingCapabilities.minCustomizationQuantity !== undefined
      ? incomingCapabilities.minCustomizationQuantity
      : existingCapabilities.minCustomizationQuantity;

  let minCustomizationQuantity;
  if (
    rawMinCustomizationQuantity !== undefined &&
    rawMinCustomizationQuantity !== null &&
    rawMinCustomizationQuantity !== ""
  ) {
    minCustomizationQuantity = Number(rawMinCustomizationQuantity);
    if (
      !Number.isFinite(minCustomizationQuantity) ||
      minCustomizationQuantity < 1
    ) {
      return {
        error:
          "Minimum customization quantity must be a whole number greater than 0",
      };
    }
  }

  const moq =
    payload.moq !== undefined
      ? Number(payload.moq)
      : Number(existingProduct?.moq || 0);

  if (customizationOptions && allowedTypes.length === 0) {
    return {
      error:
        "Select at least one allowed customization type when customization is enabled",
    };
  }

  if (
    customizationOptions &&
    minCustomizationQuantity !== undefined &&
    moq > 0 &&
    minCustomizationQuantity < moq
  ) {
    return {
      error:
        "Minimum customization quantity cannot be lower than the product MOQ",
    };
  }

  const rawNotes =
    incomingCapabilities.notes !== undefined
      ? incomingCapabilities.notes
      : existingCapabilities.notes;

  return {
    customizationOptions,
    customizationCapabilities: customizationOptions
      ? {
          allowedTypes,
          minCustomizationQuantity,
          notes: rawNotes ? String(rawNotes).trim() : undefined,
        }
      : {
          allowedTypes: [],
        },
  };
}

// GET  /api/products - List manufacturer's own products with filters + pagination
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    const query = { manufacturerId: session.user.id };

    if (status && status !== "all") {
      query.status = status;
    } else if (!status) {
      // By default exclude archived unless explicitly requested
      query.status = { $ne: "archived" };
    }

    if (category) query.category = category;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    let sortObj = {};
    switch (sort) {
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "price_asc":
        sortObj = { price: 1 };
        break;
      case "price_desc":
        sortObj = { price: -1 };
        break;
      case "popular":
        sortObj = { views: -1 };
        break;
      case "orders":
        sortObj = { totalOrders: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST  /api/products - Create a new product
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { publishNow, ...productData } = body;

    const customizationConfig = resolveCustomizationConfig(productData);
    if (customizationConfig.error) {
      return NextResponse.json(
        { error: customizationConfig.error },
        { status: 400 },
      );
    }

    // Validate required fields
    if (
      !productData.name ||
      !productData.description ||
      !productData.category
    ) {
      return NextResponse.json(
        { error: "Name, description, and category are required" },
        { status: 400 },
      );
    }
    if (!productData.price || !productData.moq) {
      return NextResponse.json(
        { error: "Price and MOQ are required" },
        { status: 400 },
      );
    }

    // ── Unverified manufacturer restrictions ────────────────────────────────
    const User = (await import("@/models/User")).default;
    const manufacturer = await User.findById(session.user.id).select(
      "verificationStatus",
    );
    const isUnverified = manufacturer?.verificationStatus === "unverified";

    if (isUnverified) {
      // Max 5 products
      const existingCount = await Product.countDocuments({
        manufacturerId: session.user.id,
        status: { $ne: "archived" },
      });
      if (existingCount >= 5) {
        return NextResponse.json(
          {
            error:
              "Unverified manufacturers can list up to 5 products. Submit a verification application to unlock unlimited listings.",
          },
          { status: 403 },
        );
      }
      // No 3D models
      if (productData.model3D?.url) {
        return NextResponse.json(
          {
            error:
              "3D model uploads are only available to verified manufacturers.",
          },
          { status: 403 },
        );
      }
    }

    const product = await Product.create({
      ...productData,
      customizationOptions: customizationConfig.customizationOptions,
      customizationCapabilities: customizationConfig.customizationCapabilities,
      manufacturerId: session.user.id,
      status: publishNow ? "active" : "draft",
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
