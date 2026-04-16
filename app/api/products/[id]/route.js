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

// GET  /api/products/[id] - Get single product detail
export async function GET(request, context) {
  const params = await context.params;
  const { id } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const product = await Product.findById(id)
      .populate(
        "manufacturerId",
        "name businessName businessLogo verificationStatus",
      )
      .lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Manufacturers can only view their own products (any status)
    // Others can only view active products
    if (session.user.role === "manufacturer") {
      if (product.manufacturerId._id.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (product.status !== "active") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Increment views for non-owner views
    if (
      session.user.role !== "manufacturer" ||
      product.manufacturerId._id.toString() !== session.user.id
    ) {
      await Product.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT  /api/products/[id] - Update product
export async function PUT(request, context) {
  const params = await context.params;
  const { id } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { publishNow, ...updateData } = body;

    const customizationConfig = resolveCustomizationConfig(updateData, product);
    if (customizationConfig.error) {
      return NextResponse.json(
        { error: customizationConfig.error },
        { status: 400 },
      );
    }

    updateData.customizationOptions = customizationConfig.customizationOptions;
    updateData.customizationCapabilities =
      customizationConfig.customizationCapabilities;

    if (publishNow) {
      updateData.status = "active";
    } else if (
      updateData.stock === 0 &&
      ["active", "out_of_stock"].includes(product.status)
    ) {
      // Auto-mark out of stock when stock hits zero (never auto-restore)
      updateData.status = "out_of_stock";
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE  /api/products/[id] - Soft delete (archive)
export async function DELETE(request, context) {
  const params = await context.params;
  const { id } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (product.status === "archived") {
      await Product.findByIdAndDelete(id);
      return NextResponse.json({
        success: true,
        message: "Product permanently deleted",
      });
    }

    // Soft delete — move to archive
    product.status = "archived";
    await product.save();

    return NextResponse.json({ success: true, message: "Product archived" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
