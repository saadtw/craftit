import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";

// PUT - Approve or reject manufacturer verification
export async function PUT(request, context) {
  const params = await context.params;
  const rawId = params.id;

  console.log("RAW ID:", rawId);

  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { action, reason, notes } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!rawId || !Types.ObjectId.isValid(rawId)) {
      return NextResponse.json(
        { error: "Invalid manufacturer ID" },
        { status: 400 }
      );
    }

    const manufacturer = await User.findById(rawId);

    if (!manufacturer) {
      return NextResponse.json(
        { error: "Manufacturer not found" },
        { status: 404 }
      );
    }

    if (manufacturer.role !== "manufacturer") {
      return NextResponse.json(
        { error: "User is not a manufacturer" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      manufacturer.verificationStatus = "approved";
      manufacturer.verifiedAt = new Date();
      manufacturer.verifiedBy = session.user.id;
      manufacturer.rejectionReason = undefined;
    } else {
      manufacturer.verificationStatus = "rejected";
      manufacturer.rejectionReason = reason || "Verification rejected by admin";
      manufacturer.verifiedAt = undefined;
    }

    await manufacturer.save();

    const verificationDoc = await VerificationDocument.findOne({
      manufacturerId: rawId,
    });

    if (verificationDoc) {
      verificationDoc.verificationStatus =
        action === "approve" ? "approved" : "rejected";
      verificationDoc.reviewedBy = session.user.id;
      verificationDoc.reviewedAt = new Date();
      verificationDoc.reviewNotes = notes;
      if (action === "reject") {
        verificationDoc.rejectionReason = reason;
      }
      await verificationDoc.save();
    }

    return NextResponse.json({
      success: true,
      message: `Manufacturer ${action}ed successfully`,
    });
  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get single manufacturer details for verification
export async function GET(request, context) {
  const params = await context.params;
  const rawId = params.id;

  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const manufacturer = await User.findById(rawId).select("-password").lean();

  const verificationDoc = await VerificationDocument.findOne({
    manufacturerId: rawId,
  }).lean();

  return NextResponse.json({
    success: true,
    manufacturer: {
      ...manufacturer,
      verificationDocuments: verificationDoc,
    },
  });
}
