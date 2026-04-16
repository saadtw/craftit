import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Product from "@/models/Product";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET /api/users/wishlist  — get current user's wishlist with populated items
export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("wishlist").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const productIds = user.wishlist
      .filter((w) => w.itemType === "product")
      .map((w) => w.itemId);

    const manufacturerIds = user.wishlist
      .filter((w) => w.itemType === "manufacturer")
      .map((w) => w.itemId);

    // Fetch products
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds }, status: "active" })
          .populate("manufacturerId", "businessName verificationStatus")
          .lean()
      : [];

    // Fetch manufacturers
    const manufacturers = manufacturerIds.length
      ? await User.find({
          _id: { $in: manufacturerIds },
          role: "manufacturer",
        })
          .select(
            "businessName businessLogo businessDescription stats.averageRating verificationStatus location",
          )
          .lean()
      : [];

    // Rebuild with addedAt from wishlist entries
    const productMap = Object.fromEntries(
      products.map((p) => [p._id.toString(), p]),
    );
    const mfgMap = Object.fromEntries(
      manufacturers.map((m) => [m._id.toString(), m]),
    );

    const enriched = user.wishlist
      .map((entry) => {
        const id = entry.itemId.toString();
        if (entry.itemType === "product") {
          return productMap[id]
            ? {
                ...productMap[id],
                _wishlistId: entry._id,
                addedAt: entry.addedAt,
                itemType: "product",
              }
            : null;
        } else {
          return mfgMap[id]
            ? {
                ...mfgMap[id],
                _wishlistId: entry._id,
                addedAt: entry.addedAt,
                itemType: "manufacturer",
              }
            : null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ wishlist: enriched });
  } catch (error) {
    console.error("GET /api/users/wishlist error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/users/wishlist  — add item to wishlist
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { itemId, itemType } = await request.json();

    if (!itemId || !["product", "manufacturer"].includes(itemType)) {
      return NextResponse.json(
        { error: "itemId and itemType (product|manufacturer) required" },
        { status: 400 },
      );
    }

    const user = await User.findById(session.user.id).select("wishlist");

    // Check if already in wishlist
    const exists = user.wishlist.some(
      (w) => w.itemId.toString() === itemId && w.itemType === itemType,
    );
    if (exists) {
      return NextResponse.json(
        { error: "Already in wishlist" },
        { status: 409 },
      );
    }

    user.wishlist.push({ itemId, itemType });
    await user.save();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/users/wishlist  — remove item from wishlist
export async function DELETE(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { itemId, itemType } = await request.json();

    await User.findByIdAndUpdate(session.user.id, {
      $pull: { wishlist: { itemId, itemType } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
