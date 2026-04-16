import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductQuestion from "@/models/ProductQuestion";
import { createNotification } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

// PATCH /api/products/[id]/qa/[questionId]
// Actions:
// - { action: "answer", answer: string }
// - { action: "visibility", isVisible: boolean }
export async function PATCH(request, context) {
  const { id, questionId } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [product, question] = await Promise.all([
      Product.findById(id).select("manufacturerId name").lean(),
      ProductQuestion.findOne({ _id: questionId, productId: id }),
    ]);

    if (!product || !question) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner =
      session.user.role === "manufacturer" &&
      product.manufacturerId.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    const body = await request.json();

    if (body.action === "answer") {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const answerText = String(body?.answer || "").trim();
      if (answerText.length < 2) {
        return NextResponse.json(
          { error: "Answer is required" },
          { status: 400 },
        );
      }

      question.answer = {
        text: answerText,
        answeredBy: session.user.id,
        answeredAt: new Date(),
      };
      question.status = "answered";
      await question.save();

      createNotification({
        userId: question.customerId,
        type: "question_answered",
        title: "Your question was answered",
        message: `You received an answer for ${product.name}.`,
        link: `/customer/products/${id}`,
        relatedType: "product",
        relatedId: id,
      });
    } else if (body.action === "visibility") {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      question.isVisible = Boolean(body?.isVisible);
      await question.save();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await ProductQuestion.findById(question._id)
      .populate("customerId", "name profilePicture")
      .populate("answer.answeredBy", "name businessName")
      .lean();

    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("Product QA PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
