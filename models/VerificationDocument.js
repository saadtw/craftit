import mongoose from "mongoose";

const VerificationDocumentSchema = new mongoose.Schema(
  {
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Structured application fields (Pakistan-context)
    ntnNumber: String,           // National Tax Number
    strnNumber: String,          // Sales Tax Registration Number
    secpRegistrationNumber: String, // SECP / Form-C company registration

    documents: [
      {
        type: {
          type: String,
          enum: [
            "ntn_certificate",          // NTN/STRN certificate
            "secp_form_c",              // SECP / Form-C incorporation certificate
            "chamber_certificate",       // Chamber of Commerce certificate
            "business_license",
            "tax_registration",
            "certification",
            "insurance",
            "bank_verification",
            "identity",
            "other",
          ],
        },
        url: {
          type: String,
          required: true,
        },
        filename: String,
        fileSize: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "suspended", "resubmission_required"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNotes: String,
    rejectionReason: String,
    reviewedAt: Date,

    resubmissionCount: {
      type: Number,
      default: 0,
    },
    resubmissionDeadline: Date,
  },
  { timestamps: true }
);

// Indexes
VerificationDocumentSchema.index({ manufacturerId: 1 });
VerificationDocumentSchema.index({ verificationStatus: 1 });

export default mongoose.models.VerificationDocument ||
  mongoose.model("VerificationDocument", VerificationDocumentSchema);
