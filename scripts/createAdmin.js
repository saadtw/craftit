// scripts/createAdmin.js
// Run with: node --env-file=.env.local scripts/createAdmin.js

import mongoose from "mongoose";
import User from "../models/User.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "a@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ADMIN_NAME = process.env.ADMIN_NAME || "admin";

async function createAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not set. Run: node --env-file=.env.local scripts/createAdmin.js",
      );
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log("Admin user already exists");
      console.log("Email:", existingAdmin.email);
      console.log("Name:", existingAdmin.name);
      console.log("Role:", existingAdmin.role);
      console.log("Active:", existingAdmin.isActive);
      console.log("ID:", existingAdmin._id.toString());
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log("Creating admin user...");

    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      name: ADMIN_NAME,
      isActive: true,
      verificationStatus: "verified",
      sessionVersion: 0,
    });

    console.log("Admin user created successfully");
    console.log("ID:", admin._id.toString());
    console.log("Email:", admin.email);
    console.log("Name:", admin.name);
    console.log("Role:", admin.role);
    console.log("Active:", admin.isActive);
    console.log("\nLogin Credentials:");
    console.log("Email:", ADMIN_EMAIL);
    console.log("Password:", ADMIN_PASSWORD);
    console.log("\nImportant: change this password after first login");

    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error.message);
    if (error?.code === 11000) {
      console.error("Duplicate key error - admin might already exist");
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

createAdmin();
