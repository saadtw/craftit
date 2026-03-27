import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

// GET - List manufacturer's own products with filters + pagination
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

// POST - Create a new product
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { publishNow, ...productData } = body;

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
    const manufacturer = await User.findById(session.user.id).select("verificationStatus");
    const isUnverified = manufacturer?.verificationStatus === "unverified";

    if (isUnverified) {
      // Max 5 products
      const existingCount = await Product.countDocuments({
        manufacturerId: session.user.id,
        status: { $ne: "archived" },
      });
      if (existingCount >= 5) {
        return NextResponse.json(
          { error: "Unverified manufacturers can list up to 5 products. Submit a verification application to unlock unlimited listings." },
          { status: 403 },
        );
      }
      // No 3D models
      if (productData.model3D?.url) {
        return NextResponse.json(
          { error: "3D model uploads are only available to verified manufacturers." },
          { status: 403 },
        );
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    const product = await Product.create({
      ...productData,
      manufacturerId: session.user.id,
      status: publishNow ? "active" : "draft",
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
