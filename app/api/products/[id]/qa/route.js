import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductQuestion from "@/models/ProductQuestion";
import { createNotification } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET /api/products/[id]/qa
export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    await connectDB();

    const product = await Product.findById(id)
      .select("manufacturerId status")
      .lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const role = session?.user?.role;
    const isOwner =
      role === "manufacturer" &&
      product.manufacturerId?.toString() === session?.user?.id;
    const isAdmin = role === "admin";

    const { searchParams } = new URL(request.url);
    const status =
      searchParams.get("status") || (isOwner || isAdmin ? "all" : "answered");
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      50,
    );
    const skip = (page - 1) * limit;

    const query = {
      productId: id,
    };

    if (!isOwner && !isAdmin) {
      query.isVisible = true;
    }

    if (status !== "all") {
      query.status = status;
    }

    const [questions, total] = await Promise.all([
      ProductQuestion.find(query)
        .populate("customerId", "name profilePicture")
        .populate("answer.answeredBy", "name businessName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductQuestion.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("Product QA GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/products/[id]/qa
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const questionText = String(body?.question || "").trim();

    if (questionText.length < 5) {
      return NextResponse.json(
        { error: "Question must be at least 5 characters" },
        { status: 400 },
      );
    }

    const product = await Product.findById(id)
      .select("manufacturerId status name")
      .lean();

    if (!product || product.status !== "active") {
      return NextResponse.json(
        { error: "Product not available" },
        { status: 404 },
      );
    }

    const question = await ProductQuestion.create({
      productId: id,
      manufacturerId: product.manufacturerId,
      customerId: session.user.id,
      question: questionText,
    });

    createNotification({
      userId: product.manufacturerId,
      type: "question_asked",
      title: "New product question",
      message: `A customer asked a question on ${product.name}.`,
      link: `/manufacturer/products/${id}`,
      relatedType: "product",
      relatedId: id,
    });

    const created = await ProductQuestion.findById(question._id)
      .populate("customerId", "name profilePicture")
      .lean();

    return NextResponse.json(
      { success: true, question: created },
      { status: 201 },
    );
  } catch (error) {
    console.error("Product QA POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
