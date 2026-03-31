// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // ✅ Changed from "bcrypt" to "bcryptjs"

const UserSchema = new mongoose.Schema(
  {
    // Basic Authentication
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "manufacturer", "admin"],
      required: true,
    },

    // Personal Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: String,
    profilePicture: String,

    // Manufacturer-specific fields
    businessName: String,
    contactPerson: String,
    businessRegistrationNumber: String,
    businessEmail: String,
    businessPhone: String,
    businessType: {
      type: String,
      enum: [
        "sole_proprietorship",
        "partnership",
        "private_limited",
        "public_limited",
        "ngo",
        "other",
      ],
    },
    businessDescription: String,
    businessLogo: String,
    businessBanner: String,

    businessAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },

    certifications: [String],
    minOrderQuantity: Number,
    manufacturingCapabilities: [
      {
        type: String,
        enum: [
          "CNC_Machining",
          "3D_Printing",
          "Injection_Molding",
          "Sheet_Metal",
          "Casting",
          "Welding",
          "Assembly",
          "Finishing",
          "Prototyping",
          "Mass_Production",
        ],
      },
    ],
    materialsAvailable: [
      {
        type: String,
        enum: [
          "Steel",
          "Aluminum",
          "Plastic",
          "Copper",
          "Brass",
          "Wood",
          "Carbon_Fiber",
          "Titanium",
          "Rubber",
          "Glass",
        ],
      },
    ],

    // ✅ FIXED: Consolidated location field (removed duplicate)
    location: {
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    budgetRange: {
      min: Number,
      max: Number,
    },

    // Verification
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "suspended"],
      default: function () {
        return this.role === "manufacturer" ? "unverified" : "verified";
      },
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: String,

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Increment to revoke active JWT sessions across devices.
    sessionVersion: {
      type: Number,
      default: 0,
    },
    suspendedAt: Date,
    suspendedUntil: Date,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    suspensionReason: String,

    // Statistics
    stats: {
      totalOrders: { type: Number, default: 0 },
      completedOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    // Preferences
    emailNotifications: { type: Boolean, default: true },
    inAppNotifications: { type: Boolean, default: true },

    // Saved Addresses (for customers)
    savedAddresses: [
      {
        label: String,
        name: String,
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
        phone: String,
        isDefault: Boolean,
      },
    ],

    // Saved payment methods (tokenized metadata only; never store full PAN/CVV)
    paymentMethods: [
      {
        type: {
          type: String,
          enum: ["card"],
          default: "card",
        },
        purpose: {
          type: String,
          enum: ["spending", "receiving"],
          default: "spending",
        },
        provider: {
          type: String,
          enum: ["stripe", "manual"],
          default: "stripe",
        },
        stripePaymentMethodId: String,
        brand: String,
        holderName: String,
        nickname: String,
        last4: String,
        expMonth: Number,
        expYear: Number,
        billingAddress: {
          line1: String,
          city: String,
          state: String,
          country: String,
          postalCode: String,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Stripe customer profile for saved card methods and future off-session charges
    stripeCustomerId: String,

    // Stripe Connect profile for manufacturer payout onboarding
    stripeConnectAccountId: String,

    // Wishlist
    wishlist: [
      {
        itemType: {
          type: String,
          enum: ["product", "manufacturer"],
        },
        itemId: mongoose.Schema.Types.ObjectId,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Metadata
    lastLogin: Date,
    lastActive: Date,

    // Password reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: Date,
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // Optional email-based 2FA for login
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorCodeToken: {
      type: String,
      select: false,
    },
    twoFactorCodeExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ verificationStatus: 1, role: 1 });
UserSchema.index({ businessName: "text", name: "text" });
UserSchema.index({ "location.country": 1 }); // For location-based filtering
UserSchema.index({ "location.state": 1 }); // For state-based manufacturer matching

UserSchema.pre("save", async function () {
  // Only hash if password is modified
  if (!this.isModified("password")) {
    return;
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  const user = await this.constructor.findById(this._id).select("+password");
  return await bcrypt.compare(candidatePassword, user.password);
};

// Update last active
UserSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};

// Check if user is currently suspended
UserSchema.methods.isCurrentlySuspended = function () {
  if (!this.suspendedAt) return false;
  if (this.suspendedUntil && new Date() > this.suspendedUntil) return false;
  return true;
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
