import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CustomOrder from "@/models/CustomOrder";
import Product from "@/models/Product";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeCustomizationTypes } from "@/lib/customization";
import mongoose from "mongoose";

// GET /api/custom-orders - List customer's custom orders
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    let query = { customerId: session.user.id };
    if (status) {
      query.status = status;
    }

    const orders = await CustomOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CustomOrder.countDocuments(query);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/custom-orders - Create new custom order
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const quantity = Number(body.quantity);

    // Validation
    if (!body.title || !body.description || !quantity) {
      return NextResponse.json(
        { error: "Title, description and quantity are required" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be a number greater than 0" },
        { status: 400 },
      );
    }

    let sourceType = "general_custom";
    let sourceProductId;
    let sourceManufacturerId;
    let sourceContext = undefined;

    const requestedCustomizationTypes = normalizeCustomizationTypes(
      body.requestedCustomizationTypes || [],
    );

    if (body.sourceProductId) {
      if (!mongoose.Types.ObjectId.isValid(body.sourceProductId)) {
        return NextResponse.json(
          { error: "sourceProductId is invalid" },
          { status: 400 },
        );
      }

      const product = await Product.findOne({
        _id: body.sourceProductId,
        status: "active",
      })
        .populate("manufacturerId", "name businessName")
        .lean();

      if (!product) {
        return NextResponse.json(
          { error: "Selected product is not available for customization" },
          { status: 404 },
        );
      }

      if (!product.customizationOptions) {
        return NextResponse.json(
          {
            error:
              "This product does not currently accept customization requests",
          },
          { status: 400 },
        );
      }

      const allowedTypes = normalizeCustomizationTypes(
        product.customizationCapabilities?.allowedTypes || [],
      );

      if (requestedCustomizationTypes.length === 0) {
        return NextResponse.json(
          {
            error:
              "Select at least one customization type for a product-based request",
          },
          { status: 400 },
        );
      }

      const disallowedTypes = requestedCustomizationTypes.filter(
        (type) => !allowedTypes.includes(type),
      );

      if (allowedTypes.length > 0 && disallowedTypes.length > 0) {
        return NextResponse.json(
          {
            error:
              "Some selected customization types are not allowed for this product",
          },
          { status: 400 },
        );
      }

      const minCustomizationQuantity =
        product.customizationCapabilities?.minCustomizationQuantity;
      if (
        minCustomizationQuantity &&
        Number.isFinite(minCustomizationQuantity) &&
        quantity < minCustomizationQuantity
      ) {
        return NextResponse.json(
          {
            error: `Minimum quantity for customization is ${minCustomizationQuantity}`,
          },
          { status: 400 },
        );
      }

      sourceType = "product_customization";
      sourceProductId = product._id;
      sourceManufacturerId = product.manufacturerId?._id;

      if (!sourceManufacturerId) {
        return NextResponse.json(
          { error: "Selected product has no valid manufacturer" },
          { status: 400 },
        );
      }

      if (
        body.sourceManufacturerId &&
        body.sourceManufacturerId.toString() !== sourceManufacturerId.toString()
      ) {
        return NextResponse.json(
          {
            error:
              "Selected manufacturer does not match the product manufacturer",
          },
          { status: 400 },
        );
      }

      sourceContext = {
        productName: product.name,
        manufacturerName:
          product.manufacturerId?.businessName || product.manufacturerId?.name,
        productCustomizationCapabilities:
          allowedTypes.length > 0 ? allowedTypes : requestedCustomizationTypes,
      };
    } else if (body.sourceManufacturerId) {
      if (!mongoose.Types.ObjectId.isValid(body.sourceManufacturerId)) {
        return NextResponse.json(
          { error: "sourceManufacturerId is invalid" },
          { status: 400 },
        );
      }

      const manufacturer = await User.findOne({
        _id: body.sourceManufacturerId,
        role: "manufacturer",
        isActive: true,
      })
        .select("name businessName")
        .lean();

      if (!manufacturer) {
        return NextResponse.json(
          { error: "Selected manufacturer is not available" },
          { status: 404 },
        );
      }

      sourceType = "manufacturer_direct";
      sourceManufacturerId = manufacturer._id;
      sourceContext = {
        manufacturerName: manufacturer.businessName || manufacturer.name,
      };
    }

    const customOrder = await CustomOrder.create({
      customerId: session.user.id,
      title: body.title,
      description: body.description,
      quantity,
      materialPreferences: body.materialPreferences || [],
      colorSpecifications: body.colorSpecifications || [],
      deadline: body.deadline,
      model3D: body.model3D || null,
      images: body.images || [],
      specialRequirements: body.specialRequirements,
      budget: body.budget,
      items: body.items || [],
      status: body.status || "draft",
      sourceType,
      sourceProductId,
      sourceManufacturerId,
      requestedCustomizationTypes,
      customizationDetails: body.customizationDetails
        ? String(body.customizationDetails).trim()
        : undefined,
      sourceContext,
    });

    return NextResponse.json(
      {
        success: true,
        order: customOrder,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
