import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductQuestion from "@/models/ProductQuestion";
import { notify } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

// POST /api/products/[id]/qa/[questionId]/reply
// Allows customer or manufacturer to post a follow-up reply on an answered question.
// Body: { text: string }
export async function POST(request, context) {
  const { id, questionId } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only customers and manufacturers may reply (not admins via this route)
    if (!["customer", "manufacturer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const [product, question] = await Promise.all([
      Product.findById(id).select("manufacturerId name").lean(),
      ProductQuestion.findOne({ _id: questionId, productId: id }),
    ]);

    if (!product || !question) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Gate: only the original customer or the product's manufacturer may reply
    const isOwnerManufacturer =
      session.user.role === "manufacturer" &&
      product.manufacturerId.toString() === session.user.id;
    const isOwnerCustomer =
      session.user.role === "customer" &&
      question.customerId.toString() === session.user.id;

    if (!isOwnerManufacturer && !isOwnerCustomer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Replies only allowed on answered questions
    if (question.status !== "answered") {
      return NextResponse.json(
        { error: "Replies are only allowed on answered questions" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const text = String(body?.text || "").trim();

    if (text.length < 1) {
      return NextResponse.json(
        { error: "Reply text is required" },
        { status: 400 },
      );
    }
    if (text.length > 1200) {
      return NextResponse.json(
        { error: "Reply too long (max 1200 characters)" },
        { status: 400 },
      );
    }

    // Push the reply
    question.replies.push({
      authorId: session.user.id,
      authorRole: session.user.role,
      text,
    });
    await question.save();

    // P1-E: Notify the other party about the new reply
    if (isOwnerCustomer) {
      // Customer replied → notify the manufacturer
      notify.questionCustomerReply(
        question.manufacturerId,
        id,
        product.name,
        true, // isManufacturer (recipient)
      );
    } else {
      // Manufacturer replied → notify the customer
      notify.questionCustomerReply(
        question.customerId,
        id,
        product.name,
        false, // isManufacturer (recipient)
      );
    }

    const updated = await ProductQuestion.findById(question._id)
      .populate("customerId", "name profilePicture")
      .populate("answer.answeredBy", "name businessName")
      .populate("replies.authorId", "name businessName profilePicture")
      .lean();

    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("Product QA reply POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
