// app/custom-orders/[id]/edit/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

export default function EditCustomOrder() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    quantity: 1,
    materialPreferences: [],
    colorSpecifications: [],
    deadline: "",
    specialRequirements: "",
    budget: "",
  });

  const [model3D, setModel3D] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [baseModelUrl, setBaseModelUrl] = useState("");

  const fetchCustomOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`);
      const data = await response.json();

      if (data.success && data.order) {
        const order = data.order;
        setFormData({
          title: order.title || "",
          description: order.description || "",
          quantity: order.quantity || 1,
          materialPreferences: order.materialPreferences || [],
          colorSpecifications: order.colorSpecifications || [],
          deadline: order.deadline ? order.deadline.split("T")[0] : "",
          specialRequirements: order.specialRequirements || "",
          budget: order.budget || "",
        });
        setModel3D(order.model3D);
        setBaseModelUrl(order.model3D?.url || "");
        setImages(order.images || []);
      } else {
        alert("Error loading order: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error loading order: " + error.message);
    } finally {
      setInitialLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchCustomOrder();
    }
  }, [status, session, router, fetchCustomOrder]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleArrayInput = (e, field) => {
    const value = e.target.value;
    const array = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      [field]: array,
    }));
  };

  const handle3DUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "3d-model");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setBaseModelUrl(data.file.url);
        setIsEditorOpen(true);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      alert("Upload error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditorSave = async (gltfBlob, annotations, cameraState, snapshotBlob) => {
    setUploading(true);
    try {
      const timestamp = Date.now();

      // 1. Upload the new edited model to S3
      const modelFile = new File([gltfBlob], `model_${timestamp}.glb`, {
        type: "model/gltf-binary",
      });
      const modelFormData = new FormData();
      modelFormData.append("file", modelFile);
      modelFormData.append("type", "3d-model");

      const modelRes = await fetch("/api/upload", { method: "POST", body: modelFormData });
      const modelData = await modelRes.json();

      if (!modelData.success) {
        alert("Save failed: " + (modelData.error || "Upload error"));
        return;
      }

      // 2. Upload the snapshot image to S3 (if captured)
      let snapshotUrl = null;
      if (snapshotBlob) {
        const snapshotFile = new File([snapshotBlob], `snapshot_${timestamp}.png`, {
          type: "image/png",
        });
        const snapFormData = new FormData();
        snapFormData.append("file", snapshotFile);
        snapFormData.append("type", "image");

        const snapRes = await fetch("/api/upload", { method: "POST", body: snapFormData });
        const snapData = await snapRes.json();

        if (snapData.success) {
          snapshotUrl = snapData.file.url;
        } else {
          console.warn("[custom-order-editor] Snapshot upload failed:", snapData.error);
        }
      }

      // 3. Atomic Update: swap URLs in DB + delete old S3 objects
      const updateRes = await fetch("/api/models/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: params.id,
          resourceType: "customOrder",
          newModelUrl: modelData.file.url,
          newThumbnailUrl: snapshotUrl || undefined,
          newFileSize: gltfBlob.size,
          annotations,
          cameraState,
        }),
      });
      const updateData = await updateRes.json();

      if (!updateData.success) {
        console.error("[custom-order-editor] DB update failed:", updateData.error);
      }

      // 4. Update local state
      const nextModel = {
        url: modelData.file.url,
        filename: modelFile.name,
        fileSize: gltfBlob.size,
        thumbnailUrl: snapshotUrl || model3D?.thumbnailUrl,
        annotations,
        cameraState,
      };
      setModel3D(nextModel);
      setBaseModelUrl(nextModel.url);
      setIsEditorOpen(false);
    } catch (error) {
      console.error("[custom-order-editor] Save error:", error);
      alert("Save error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("folder", "images");

      const response = await fetch("/api/upload/multiple", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setImages((prev) => [...prev, ...data.files]);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      alert("Upload error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/custom-orders/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          model3D,
          images,
          budget: formData.budget ? Number(formData.budget) : undefined,
          quantity: Number(formData.quantity),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Custom order updated!");
        router.push(`/custom-orders/${params.id}/review`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || initialLoading)
    return <div className="p-6">Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f6]">
      <CustomerMainNavbar />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Edit Custom Order</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 font-semibold">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Quantity *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Material Preferences (comma-separated)
            </label>
            <input
              type="text"
              placeholder="Aluminum, Steel, Plastic"
              value={formData.materialPreferences.join(", ")}
              onChange={(e) => handleArrayInput(e, "materialPreferences")}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Color Specifications (comma-separated)
            </label>
            <input
              type="text"
              placeholder="Black, White, Silver"
              value={formData.colorSpecifications.join(", ")}
              onChange={(e) => handleArrayInput(e, "colorSpecifications")}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Deadline</label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Budget ($)</label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              min="0"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Special Requirements
            </label>
            <textarea
              name="specialRequirements"
              value={formData.specialRequirements}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Upload 3D Model</label>
            {!isEditorOpen && (
              <>
                <input
                  type="file"
                  accept=".stl,.obj,.gltf,.glb"
                  onChange={handle3DUpload}
                  className="w-full border p-2 rounded"
                />
                {model3D && (
                  <div className="mt-2 p-3 bg-green-100 rounded flex items-center justify-between gap-3">
                    <span className="text-sm">✓ {model3D.filename} ready</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBaseModelUrl(model3D.url);
                        setIsEditorOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Open 3D Editor
                    </button>
                  </div>
                )}
              </>
            )}

            {isEditorOpen && baseModelUrl && (
              <div className="mt-4 border rounded p-2">
                <Editor3DWrapper
                  modelUrl={baseModelUrl}
                  initialAnnotations={model3D?.annotations}
                  initialCameraState={model3D?.cameraState}
                  onSave={handleEditorSave}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    Close Editor
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Upload Images</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageUpload}
              className="w-full border p-2 rounded"
            />
            {images.length > 0 && (
              <div className="mt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="p-2 bg-green-100 rounded mb-1">
                    ✓ {img.filename}
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && <p className="text-blue-600">Uploading files...</p>}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push(`/custom-orders/${params.id}/review`)}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
