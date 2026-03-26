import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";
import { notify } from "@/services/notificationService";

/**
 * PUT /api/admin/manufacturers/[id]/verify
 * Approve or reject manufacturer verification.
 * Now also supports "request_info" action.
 */
export async function PUT(request, context) {
  const params = await context.params;
  const rawId = params.id;

  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 },
      );
    }

    await connectDB();

    const body = await request.json();
    const { action, reason, notes } = body;

    if (!["approve", "reject", "request_info"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!rawId || !Types.ObjectId.isValid(rawId)) {
      return NextResponse.json(
        { error: "Invalid manufacturer ID" },
        { status: 400 },
      );
    }

    if ((action === "reject" || action === "request_info") && !reason) {
      return NextResponse.json(
        { error: "reason is required for reject and request_info" },
        { status: 400 },
      );
    }

    const manufacturer = await User.findById(rawId);

    if (!manufacturer) {
      return NextResponse.json(
        { error: "Manufacturer not found" },
        { status: 404 },
      );
    }

    if (manufacturer.role !== "manufacturer") {
      return NextResponse.json(
        { error: "User is not a manufacturer" },
        { status: 400 },
      );
    }

    const verificationDoc = await VerificationDocument.findOne({
      manufacturerId: rawId,
    });

    if (action === "approve") {
      manufacturer.verificationStatus = "verified";
      manufacturer.verifiedAt = new Date();
      manufacturer.verifiedBy = session.user.id;
      manufacturer.rejectionReason = undefined;

      if (verificationDoc) {
        verificationDoc.verificationStatus = "verified";
        verificationDoc.reviewedBy = session.user.id;
        verificationDoc.reviewedAt = new Date();
        verificationDoc.reviewNotes = notes;
        await verificationDoc.save();
      }

      await notify.verificationApproved(manufacturer._id);
    }

    if (action === "reject") {
      manufacturer.verificationStatus = "unverified";
      manufacturer.rejectionReason = reason || "Verification rejected by admin";
      manufacturer.verifiedAt = undefined;

      if (verificationDoc) {
        verificationDoc.verificationStatus = "suspended";
        verificationDoc.reviewedBy = session.user.id;
        verificationDoc.reviewedAt = new Date();
        verificationDoc.reviewNotes = notes;
        verificationDoc.rejectionReason = reason;
        await verificationDoc.save();
      }

      await notify.verificationRejected(manufacturer._id, reason);
    }

    if (action === "request_info") {
      // Status stays unverified but a deadline is set for resubmission
      if (verificationDoc) {
        verificationDoc.verificationStatus = "resubmission_required";
        verificationDoc.reviewNotes = reason;
        verificationDoc.resubmissionCount =
          (verificationDoc.resubmissionCount || 0) + 1;
        verificationDoc.resubmissionDeadline = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await verificationDoc.save();
      }

      await notify.verificationRejected(
        manufacturer._id,
        `Additional information required: ${reason}`,
      );
    }

    await manufacturer.save();

    return NextResponse.json({
      success: true,
      message: `Manufacturer ${action === "request_info" ? "information requested" : action + "d"} successfully`,
    });
  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/admin/manufacturers/[id]/verify — get manufacturer details for admin review
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
