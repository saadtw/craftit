import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

// POST  /api/products/bulk - Bulk actions on products
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { action, productIds } = await request.json();

    if (
      !action ||
      !productIds ||
      !Array.isArray(productIds) ||
      productIds.length === 0
    ) {
      return NextResponse.json(
        { error: "action and productIds array are required" },
        { status: 400 },
      );
    }

    const validActions = ["publish", "draft", "archive", "out_of_stock"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify all products belong to this manufacturer
    const count = await Product.countDocuments({
      _id: { $in: productIds },
      manufacturerId: session.user.id,
    });

    if (count !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products not found or not owned by you" },
        { status: 403 },
      );
    }

    const statusMap = {
      publish: "active",
      draft: "draft",
      archive: "archived",
      out_of_stock: "out_of_stock",
    };

    const result = await Product.updateMany(
      { _id: { $in: productIds }, manufacturerId: session.user.id },
      { $set: { status: statusMap[action] } },
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} product(s) updated`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
