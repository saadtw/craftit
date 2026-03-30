import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

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
