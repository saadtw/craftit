"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function NewCustomOrder() {
  const router = useRouter();
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
        setModel3D(data.file);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      alert("Upload error: " + error.message);
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
      const response = await fetch("/api/custom-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          model3D,
          images,
          status: "draft",
          budget: formData.budget ? Number(formData.budget) : undefined,
          quantity: Number(formData.quantity),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Custom order created!");
        router.push(`/custom-orders/${data.order._id}/review`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return <div>Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return <div>Redirecting to login...</div>;
  }

  if (session?.user?.role !== "customer") {
    return <div>Access denied. Customers only.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create Custom Order</h1>

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
          <input
            type="file"
            accept=".stl,.obj,.gltf,.glb"
            onChange={handle3DUpload}
            className="w-full border p-2 rounded"
          />
          {model3D && (
            <div className="mt-2 p-2 bg-green-100 rounded">
              ✓ {model3D.filename} uploaded
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

        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Creating..." : "Create Custom Order"}
        </button>
      </form>
    </div>
  );
}
