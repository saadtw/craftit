// app/api/verification-documents/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";

const ALLOWED_DOC_TYPES = [
  "ntn_certificate",
  "secp_form_c",
  "chamber_certificate",
  "business_license",
  "tax_registration",
  "certification",
  "insurance",
  "bank_verification",
  "identity",
  "other",
];

// GET /api/verification-documents - Manufacturer fetches their own verification status
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const doc = await VerificationDocument.findOne({
      manufacturerId: session.user.id,
    }).lean();
    const user = await User.findById(session.user.id)
      .select("verificationStatus rejectionReason verifiedAt")
      .lean();
    return NextResponse.json({ success: true, verificationDoc: doc, user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/verification-documents - Submit/resubmit verification application
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
    const { documents, ntnNumber, strnNumber, secpRegistrationNumber } = body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one document is required" },
        { status: 400 },
      );
    }

    const sanitizedDocuments = documents
      .filter((doc) => doc && doc.url && ALLOWED_DOC_TYPES.includes(doc.type))
      .map((doc) => ({
        type: doc.type,
        url: String(doc.url),
        filename: doc.filename ? String(doc.filename) : undefined,
        fileSize: doc.fileSize != null ? Number(doc.fileSize) : undefined,
      }));

    if (sanitizedDocuments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid documents provided. Check document types.",
        },
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

    const applicationFields = {
      ntnNumber: ntnNumber || undefined,
      strnNumber: strnNumber || undefined,
      secpRegistrationNumber: secpRegistrationNumber || undefined,
    };

    if (existing) {
      // Replace documents on resubmission (don't just append)
      existing.documents = sanitizedDocuments;
      existing.verificationStatus = "pending";
      existing.reviewedBy = undefined;
      existing.reviewedAt = undefined;
      existing.reviewNotes = undefined;
      existing.rejectionReason = undefined;
      if (ntnNumber) existing.ntnNumber = ntnNumber;
      if (strnNumber) existing.strnNumber = strnNumber;
      if (secpRegistrationNumber)
        existing.secpRegistrationNumber = secpRegistrationNumber;
      await existing.save();
    } else {
      await VerificationDocument.create({
        manufacturerId: session.user.id,
        documents: sanitizedDocuments,
        verificationStatus: "pending",
        ...applicationFields,
      });
    }

    // Keep manufacturer status as unverified until admin approves
    if (manufacturer.verificationStatus !== "verified") {
      manufacturer.verificationStatus = "unverified";
      await manufacturer.save();
    }

    return NextResponse.json({
      success: true,
      message:
        "Verification application submitted. An admin will review your documents shortly.",
    });
  } catch (error) {
    console.error("Verification document submission error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Submission failed" },
      { status: 500 },
    );
  }
}
