import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { deleteFromStorage } from "@/lib/storage";
import Product from "@/models/Product";
import CustomOrder from "@/models/CustomOrder";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { urls, origin } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: false, message: "No valid URLs provided" }, { status: 400 });
    }

    // 1. Delete from Supabase Storage
    const deletePromises = urls.map((url) => deleteFromStorage(url));
    await Promise.allSettled(deletePromises);

    // 2. Optionally clean up from MongoDB if an origin is provided
    // Expected origin format: { type: "Product" | "CustomOrder", id: "mongoObjectId" }
    if (origin && origin.type && origin.id && origin.id !== "draft") {
      await connectDB();

      if (origin.type === "Product") {
        const product = await Product.findById(origin.id);
        if (product) {
          let updated = false;
          // Check images
          if (product.images && product.images.length > 0) {
            const originalLength = product.images.length;
            product.images = product.images.filter(img => !urls.includes(img.url));
            if (product.images.length !== originalLength) updated = true;
          }
          // Check 3D model
          if (product.model3D && urls.includes(product.model3D.url)) {
            product.model3D.url = null;
            product.model3D.filename = null;
            product.model3D.fileSize = null;
            product.model3D.thumbnailUrl = null;
            updated = true;
          }

          if (updated) {
            await product.save();
          }
        }
      } else if (origin.type === "CustomOrder") {
        const order = await CustomOrder.findById(origin.id);
        if (order) {
          let updated = false;
          // Check images
          if (order.images && order.images.length > 0) {
            const originalLength = order.images.length;
            order.images = order.images.filter(img => !urls.includes(img.url));
            if (order.images.length !== originalLength) updated = true;
          }
          // Check 3D model
          if (order.model3D && urls.includes(order.model3D.url)) {
            order.model3D.url = null;
            order.model3D.filename = null;
            order.model3D.fileSize = null;
            order.model3D.thumbnailUrl = null;
            updated = true;
          }

          if (updated) {
            await order.save();
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "Files cleaned up successfully" });
  } catch (error) {
    console.error("[Cleanup API Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
