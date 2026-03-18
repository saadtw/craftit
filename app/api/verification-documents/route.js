import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";

const ALLOWED_DOC_TYPES = [
  "business_license",
  "tax_registration",
  "certification",
  "insurance",
  "bank_verification",
  "identity",
  "other",
];

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "manufacturer") {
      return NextResponse.json(
        { success: false, error: "Only manufacturers can submit documents" },
        { status: 403 },
      );
    }

    await connectDB();

    const body = await request.json();
    const { documents, docType } = body;

    if (!ALLOWED_DOC_TYPES.includes(docType)) {
      return NextResponse.json(
        { success: false, error: "Invalid document type" },
        { status: 400 },
      );
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one document is required" },
        { status: 400 },
      );
    }

    const sanitizedDocuments = documents
      .filter((doc) => doc && doc.url)
      .map((doc) => ({
        type: docType,
        url: String(doc.url),
        filename: doc.filename ? String(doc.filename) : undefined,
        fileSize:
          doc.fileSize !== undefined && doc.fileSize !== null
            ? Number(doc.fileSize)
            : undefined,
      }));

    if (sanitizedDocuments.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid documents provided" },
        { status: 400 },
      );
    }

    const manufacturer = await User.findById(session.user.id);
    if (!manufacturer || manufacturer.role !== "manufacturer") {
      return NextResponse.json(
        { success: false, error: "Manufacturer not found" },
        { status: 404 },
      );
    }

    const existing = await VerificationDocument.findOne({
      manufacturerId: session.user.id,
    });

    if (existing) {
      existing.documents.push(...sanitizedDocuments);
      existing.verificationStatus = "pending";
      existing.reviewedBy = undefined;
      existing.reviewedAt = undefined;
      existing.reviewNotes = undefined;
      existing.rejectionReason = undefined;
      await existing.save();
    } else {
      await VerificationDocument.create({
        manufacturerId: session.user.id,
        documents: sanitizedDocuments,
        verificationStatus: "pending",
      });
    }

    if (manufacturer.verificationStatus !== "verified") {
      manufacturer.verificationStatus = "unverified";
      await manufacturer.save();
    }

    return NextResponse.json({
      success: true,
      message: "Documents submitted for verification",
    });
  } catch (error) {
    console.error("Verification document submission error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Submission failed" },
      { status: 500 },
    );
  }
}
