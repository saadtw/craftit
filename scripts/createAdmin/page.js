//npm run dev

// scripts/createAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Hardcode MongoDB URI or use env
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/your-database";

// Define User Schema directly (since we can't import ES modules easily)
const UserSchema = new mongoose.Schema(
  {
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
    },
    role: {
      type: String,
      enum: ["customer", "manufacturer", "admin"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function createAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    console.log("URI:", MONGODB_URI);

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: "admin@yourplatform.com",
    });

    if (existingAdmin) {
      console.log("❌ Admin user already exists!");
      console.log("Admin details:");
      console.log("- Email:", existingAdmin.email);
      console.log("- Name:", existingAdmin.name);
      console.log("- Role:", existingAdmin.role);
      console.log("- Active:", existingAdmin.isActive);
      console.log("- ID:", existingAdmin._id);
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log("Creating admin user...");

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);
    console.log("✅ Password hashed");

    // Create admin user
    const admin = new User({
      email: "admin@yourplatform.com",
      password: hashedPassword,
      role: "admin",
      name: "Admin User",
      isActive: true,
      verificationStatus: "approved",
    });

    await admin.save();
    console.log("✅ Admin user created successfully!");

    // Verify the user was created
    const verifyAdmin = await User.findOne({ email: "admin@yourplatform.com" });

    if (verifyAdmin) {
      console.log("\n📋 Admin User Details:");
      console.log("- ID:", verifyAdmin._id);
      console.log("- Email:", verifyAdmin.email);
      console.log("- Name:", verifyAdmin.name);
      console.log("- Role:", verifyAdmin.role);
      console.log("- Active:", verifyAdmin.isActive);
      console.log("- Created:", verifyAdmin.createdAt);
      console.log("\n🔑 Login Credentials:");
      console.log("- Email: admin@yourplatform.com");
      console.log("- Password: admin123");
      console.log("\n⚠️  IMPORTANT: Change this password after first login!");
    } else {
      console.log("❌ Warning: Could not verify admin user creation");
    }

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    console.error("Error details:", error.message);
    if (error.code === 11000) {
      console.error("Duplicate key error - admin might already exist");
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdmin();
