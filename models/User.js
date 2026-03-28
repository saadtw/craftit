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
        // return this.role === "manufacturer" ? "unverified" : "verified";
        return "verified";
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
  },
  { timestamps: true },
);

// Indexes
UserSchema.index({ email: 1 });
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
