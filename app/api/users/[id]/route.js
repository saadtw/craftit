import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const CAPABILITY_ENUM = [
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
];

const MATERIAL_ENUM = [
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
];

// PATCH /api/users/[id] — update own profile
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Users may only update their own profile
    if (session.user.id !== params.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();

    const body = await request.json();

    const baseAllowed = ["name", "phone", "bio", "address"];
    const manufacturerAllowed = [
      "businessName",
      "businessDescription",
      "businessLogo",
      "businessBanner",
      "minOrderQuantity",
      "businessAddress",
      "manufacturingCapabilities",
      "materialsAvailable",
      "budgetRange",
      "certifications",
    ];
    const allowed =
      session.user.role === "manufacturer"
        ? [...baseAllowed, ...manufacturerAllowed]
        : baseAllowed;

    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        update[key] = body[key];
      }
    }

    if (update.name !== undefined) {
      update.name = String(update.name).trim();
      if (!update.name) {
        return NextResponse.json(
          { success: false, error: "Name cannot be empty" },
          { status: 400 },
        );
      }
    }

    if (update.businessName !== undefined) {
      update.businessName = String(update.businessName).trim();
      if (!update.businessName) {
        return NextResponse.json(
          { success: false, error: "Business name cannot be empty" },
          { status: 400 },
        );
      }
    }

    if (update.businessDescription !== undefined) {
      update.businessDescription = String(update.businessDescription).trim();
    }

    if (update.phone !== undefined) {
      update.phone = String(update.phone).trim();
    }

    if (update.businessLogo !== undefined) {
      update.businessLogo = String(update.businessLogo).trim();
    }

    if (update.businessBanner !== undefined) {
      update.businessBanner = String(update.businessBanner).trim();
    }

    if (update.minOrderQuantity !== undefined) {
      if (
        update.minOrderQuantity === null ||
        update.minOrderQuantity === "" ||
        Number.isNaN(Number(update.minOrderQuantity))
      ) {
        update.minOrderQuantity = undefined;
      } else {
        update.minOrderQuantity = Number(update.minOrderQuantity);
      }
    }

    if (update.budgetRange !== undefined) {
      const min = Number(update.budgetRange?.min);
      const max = Number(update.budgetRange?.max);
      update.budgetRange = {
        min: Number.isFinite(min) ? min : undefined,
        max: Number.isFinite(max) ? max : undefined,
      };
    }

    if (update.manufacturingCapabilities !== undefined) {
      const capabilities = Array.isArray(update.manufacturingCapabilities)
        ? update.manufacturingCapabilities
        : [];
      update.manufacturingCapabilities = capabilities.filter((c) =>
        CAPABILITY_ENUM.includes(c),
      );
    }

    if (update.materialsAvailable !== undefined) {
      const materials = Array.isArray(update.materialsAvailable)
        ? update.materialsAvailable
        : [];
      update.materialsAvailable = materials.filter((m) =>
        MATERIAL_ENUM.includes(m),
      );
    }

    if (update.certifications !== undefined) {
      update.certifications = Array.isArray(update.certifications)
        ? update.certifications.map((c) => String(c).trim()).filter(Boolean)
        : [];
    }

    const user = await User.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("User PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Update failed" },
      { status: 500 },
    );
  }
}
