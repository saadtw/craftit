import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import CustomOrder from "@/models/CustomOrder";

// Allow up to 5 minutes — converter may take time
export const maxDuration = 300;

const RESOURCE_MODELS = {
  product: Product,
  customOrder: CustomOrder,
};

/**
 * POST /api/upload/convert-async
 * Triggers the converter microservice asynchronously after a direct upload.
 *
 * Body: {
 *   storagePath: string,       // e.g. "3d-models/raw/1234-model.stl"
 *   resourceId?: string,       // MongoDB doc ID to patch on success
 *   resourceType?: string,     // "product" | "customOrder"
 * }
 *
 * Returns: { success: true, url: <converted glb public URL> }
 */
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { storagePath, resourceId, resourceType } = body;
    if (!storagePath) {
      return NextResponse.json({ success: false, error: "storagePath is required" }, { status: 400 });
    }

    const converterUrl = process.env.CONVERTER_SERVICE_URL;
    const converterSecret = process.env.CONVERTER_SECRET;

    if (!converterUrl) {
      return NextResponse.json(
        { success: false, error: "Converter service not configured (CONVERTER_SERVICE_URL missing)" },
        { status: 500 }
      );
    }

    // Build the public URL for the raw file
    const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const inputUrl = `${supabaseBase}/storage/v1/object/public/craftit-uploads/${storagePath}`;

    // Derive the output path
    const baseName = storagePath.split("/").pop().replace(/\.[^.]+$/, "");
    const timestamp = Date.now();
    const outputPath = `3d-models/converted/${timestamp}-${baseName}.glb`;

    // Call the converter microservice
    const converterRes = await fetch(`${converterUrl}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${converterSecret}`,
      },
      body: JSON.stringify({
        input_url: inputUrl,
        output_path: outputPath,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_secret_key: process.env.SUPABASE_SECRET_KEY,
      }),
    });

    const converterData = await converterRes.json();

    if (!converterRes.ok || !converterData.success) {
      console.error("[ConvertAsync] Converter failed:", converterData.error);
      return NextResponse.json(
        { success: false, error: converterData.error || "Conversion failed" },
        { status: 502 }
      );
    }

    const finalUrl = converterData.url;

    // Optionally patch the MongoDB document with the converted model URL
    if (resourceId && resourceType && RESOURCE_MODELS[resourceType]) {
      try {
        await connectDB();
        await RESOURCE_MODELS[resourceType].findByIdAndUpdate(
          resourceId,
          { $set: { "model3D.url": finalUrl } },
          { runValidators: false }
        );
        console.log(`[ConvertAsync] Patched ${resourceType} ${resourceId} with new model URL`);
      } catch (dbErr) {
        // Don't fail the request — URL is still returned
        console.warn("[ConvertAsync] DB patch failed:", dbErr.message);
      }
    }

    // Cleanup the raw input file from Supabase so only the converted file remains
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { error: deleteError } = await supabaseAdmin.storage
      .from("craftit-uploads")
      .remove([storagePath]);

    if (deleteError) {
      console.warn("[ConvertAsync] Failed to cleanup raw file:", deleteError.message);
    } else {
      console.log(`[ConvertAsync] Cleaned up raw file: ${storagePath}`);
    }

    return NextResponse.json({ success: true, url: finalUrl, path: outputPath });
  } catch (error) {
    console.error("[ConvertAsync] Unexpected error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
