import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Order from "@/models/Order";
import User from "@/models/User";

// POST /api/orders/product
// Customer places a direct product order.
// Body: { productId, quantity, deliveryAddress, paymentMethod, specialRequirements? }

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      productId,
      quantity,
      deliveryAddress,
      paymentMethod,
      specialRequirements,
    } = body;

    // --- Validation ---
    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "quantity must be at least 1" },
        { status: 400 },
      );
    }
    if (
      !deliveryAddress?.street ||
      !deliveryAddress?.city ||
      !deliveryAddress?.country
    ) {
      return NextResponse.json(
        { error: "deliveryAddress with street, city, and country is required" },
        { status: 400 },
      );
    }

    // --- Load product ---
    const product = await Product.findById(productId)
      .populate(
        "manufacturerId",
        "_id name businessName isActive verificationStatus",
      )
      .lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.status !== "active") {
      return NextResponse.json(
        { error: "This product is not available" },
        { status: 400 },
      );
    }
    if (!product.manufacturerId?.isActive) {
      return NextResponse.json(
        { error: "Manufacturer is not active" },
        { status: 400 },
      );
    }

    // --- MOQ check ---
    if (quantity < product.moq) {
      return NextResponse.json(
        {
          error: `Minimum order quantity for this product is ${product.moq} units`,
        },
        { status: 400 },
      );
    }

    // --- Price calculation ---
    const unitPrice = product.price;
    const totalPrice = unitPrice * quantity;

    // --- Create order ---
    const order = await Order.create({
      customerId: session.user.id,
      manufacturerId: product.manufacturerId._id,
      orderType: "product",
      productId: product._id,
      productDetails: {
        name: product.name,
        description: product.description,
        specifications: product.specifications,
      },
      quantity,
      unitPrice,
      totalPrice,
      timeline: product.leadTime || null,
      status: "pending_acceptance",
      paymentStatus: "authorized",
      paymentMethod: paymentMethod || "card",
      deliveryAddress,
      specialRequirements: specialRequirements || "",
      estimatedDeliveryDate: product.leadTime
        ? new Date(Date.now() + product.leadTime * 24 * 60 * 60 * 1000)
        : undefined,
    });

    // --- Update product stats ---
    await Product.findByIdAndUpdate(productId, {
      $inc: { totalOrders: 1 },
    });

    // --- Update manufacturer stats ---
    await User.findByIdAndUpdate(product.manufacturerId._id, {
      $inc: { "stats.totalOrders": 1 },
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("customerId", "name email")
      .populate("manufacturerId", "name businessName email")
      .populate("productId", "name images price")
      .lean();

    return NextResponse.json(
      { success: true, order: populatedOrder },
      { status: 201 },
    );
  } catch (error) {
    console.error("Product order POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
