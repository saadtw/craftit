import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { resolveRequestSession } from "@/lib/requestAuth";

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
    const { id: userId } = await params;

    const session = await resolveRequestSession(request);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Users may only update their own profile
    if (session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();

    const body = await request.json();

    const baseAllowed = [
      "name",
      "phone",
      "bio",
      "address",
      "profilePicture",
      "pushToken",
    ];
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
      "productionCapacity",
      "leadTimeDays",
      "customizationCapabilities",
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
      if (update.name.length < 3 || update.name.length > 100) {
        return NextResponse.json(
          { success: false, error: "Name must be between 3 and 100 characters" },
          { status: 400 },
        );
      }
    }

    if (update.businessName !== undefined) {
      update.businessName = String(update.businessName).trim();
      if (update.businessName.length < 3 || update.businessName.length > 100) {
        return NextResponse.json(
          { success: false, error: "Business name must be between 3 and 100 characters" },
          { status: 400 },
        );
      }
    }

    if (update.businessDescription !== undefined) {
      update.businessDescription = String(update.businessDescription).trim();
    }

    if (update.bio !== undefined) {
      update.bio = String(update.bio).trim();
      if (update.bio.length > 500) {
        return NextResponse.json(
          { success: false, error: "Bio cannot exceed 500 characters" },
          { status: 400 },
        );
      }
    }

    if (update.phone !== undefined) {
      update.phone = String(update.phone).trim();
      if (update.phone !== "") {
        const digits = update.phone.replace(/\D/g, "");
        if (digits.length !== 11) {
          return NextResponse.json(
            { success: false, error: "Please enter correct 11-digit phone number" },
            { status: 400 },
          );
        }
      }
    }

    if (update.address !== undefined) {
      if (update.address.postalCode !== undefined) {
        const pc = String(update.address.postalCode).trim();
        if (pc !== "") {
          const digits = pc.replace(/\D/g, "");
          if (digits.length < 4 || digits.length > 10) {
            return NextResponse.json(
              { success: false, error: "Please enter a valid postal code (4 to 10 digits)" },
              { status: 400 },
            );
          }
        }
      }
    }

    if (update.businessAddress !== undefined) {
      if (update.businessAddress.postalCode !== undefined) {
        const pc = String(update.businessAddress.postalCode).trim();
        if (pc !== "") {
          const digits = pc.replace(/\D/g, "");
          if (digits.length < 4 || digits.length > 10) {
            return NextResponse.json(
              { success: false, error: "Please enter a valid postal code (4 to 10 digits)" },
              { status: 400 },
            );
          }
        }
      }
    }

    if (update.profilePicture !== undefined) {
      // Allow null to clear the profile picture
      update.profilePicture =
        update.profilePicture === null
          ? null
          : String(update.profilePicture).trim();
    }

    if (update.pushToken !== undefined) {
      // Allow null to unregister push notifications
      update.pushToken =
        update.pushToken === null ? null : String(update.pushToken).trim();
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
        const moq = Number(update.minOrderQuantity);
        if (!Number.isInteger(moq) || moq < 1) {
          return NextResponse.json(
            { success: false, error: "Minimum order quantity must be a positive integer" },
            { status: 400 },
          );
        }
        update.minOrderQuantity = moq;
      }
    }

    if (update.budgetRange !== undefined) {
      const min = update.budgetRange?.min !== undefined && update.budgetRange?.min !== null && update.budgetRange?.min !== "" ? Number(update.budgetRange?.min) : undefined;
      const max = update.budgetRange?.max !== undefined && update.budgetRange?.max !== null && update.budgetRange?.max !== "" ? Number(update.budgetRange?.max) : undefined;

      if (min !== undefined && (isNaN(min) || min < 0)) {
        return NextResponse.json(
          { success: false, error: "Minimum project threshold must be a non-negative number" },
          { status: 400 },
        );
      }
      if (max !== undefined && (isNaN(max) || max < 0)) {
        return NextResponse.json(
          { success: false, error: "Maximum project capacity must be a non-negative number" },
          { status: 400 },
        );
      }
      if (min !== undefined && max !== undefined && max < min) {
        return NextResponse.json(
          { success: false, error: "Maximum project capacity cannot be less than minimum threshold" },
          { status: 400 },
        );
      }

      update.budgetRange = {
        min,
        max,
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

    if (update.productionCapacity !== undefined) {
      if (typeof update.productionCapacity === 'object') {
         update.productionCapacity = {
            unitsPerMonth: Number(update.productionCapacity.unitsPerMonth) || 0,
            minimumOrderQuantity: Number(update.productionCapacity.minimumOrderQuantity) || 1,
            maximumOrderQuantity: Number(update.productionCapacity.maximumOrderQuantity) || 10000,
         };
      }
    }

    if (update.leadTimeDays !== undefined) {
      if (typeof update.leadTimeDays === 'object') {
         update.leadTimeDays = {
            typical: Number(update.leadTimeDays.typical) || undefined,
            minimum: Number(update.leadTimeDays.minimum) || undefined,
         };
      }
    }

    if (update.customizationCapabilities !== undefined) {
      update.customizationCapabilities = Array.isArray(update.customizationCapabilities)
        ? update.customizationCapabilities.map((c) => String(c).trim()).filter(Boolean)
        : [];
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { returnDocument: "after", runValidators: true },
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
