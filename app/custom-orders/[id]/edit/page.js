// app/custom-orders/[id]/edit/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayInput = (e, field) => {
    const array = e.target.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, [field]: array }));
  };

  const handle3DUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "3d-model");
      const response = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await response.json();
      if (data.success) {
        setBaseModelUrl(data.file.url);
        setIsEditorOpen(true);
      } else alert("Upload failed: " + data.error);
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
      const fd = new FormData();
      files.forEach((file) => fd.append("files", file));
      fd.append("folder", "images");
      const response = await fetch("/api/upload/multiple", {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (data.success) setImages((prev) => [...prev, ...data.files]);
      else alert("Upload failed: " + data.error);
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
        headers: { "Content-Type": "application/json" },
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

  const inputClass =
    "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]/40 focus:bg-white/[0.06] transition-all";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2";

  if (status === "loading" || initialLoading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading order..." />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <CustomerMainNavbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
            Custom Order
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Edit Order
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                info
              </span>
              Basic Information
            </h2>

            <div>
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter order title"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe your order in detail..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Budget ($)</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  min="0"
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Deadline</label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>
          </div>

          {/* Specifications */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                tune
              </span>
              Specifications
            </h2>

            <div>
              <label className={labelClass}>Material Preferences</label>
              <input
                type="text"
                placeholder="Aluminum, Steel, Plastic"
                value={formData.materialPreferences.join(", ")}
                onChange={(e) => handleArrayInput(e, "materialPreferences")}
                className={inputClass}
              />
              <p className="text-[11px] text-white/25 mt-1.5">
                Separate multiple materials with commas
              </p>
            </div>

            <div>
              <label className={labelClass}>Color Specifications</label>
              <input
                type="text"
                placeholder="Black, White, Silver"
                value={formData.colorSpecifications.join(", ")}
                onChange={(e) => handleArrayInput(e, "colorSpecifications")}
                className={inputClass}
              />
              <p className="text-[11px] text-white/25 mt-1.5">
                Separate multiple colors with commas
              </p>
            </div>

            <div>
              <label className={labelClass}>Special Requirements</label>
              <textarea
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleChange}
                rows={4}
                placeholder="Any special requirements or notes..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* File Uploads */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                attach_file
              </span>
              Attachments
            </h2>

            {/* 3D Model */}
            <div>
              <label className={labelClass}>3D Model</label>
              {!isEditorOpen && (
                <>
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 cursor-pointer hover:border-[#eb9728]/30 hover:bg-white/[0.04] transition-all group">
                    <span className="material-symbols-outlined text-3xl text-white/20 group-hover:text-[#eb9728]/50 transition-colors">
                      view_in_ar
                    </span>
                    <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                      Click to upload 3D model
                    </p>
                    <p className="text-[11px] text-white/20">
                      .stl, .obj, .gltf, .glb
                    </p>
                    <input
                      type="file"
                      accept=".stl,.obj,.gltf,.glb"
                      onChange={handle3DUpload}
                      className="hidden"
                    />
                  </label>
                  {model3D && (
                    <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/8">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[15px] text-emerald-400">
                          check_circle
                        </span>
                        <p className="text-[11px] font-semibold text-emerald-400">
                          {model3D.filename} ready
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBaseModelUrl(model3D.url);
                          setIsEditorOpen(true);
                        }}
                        className="px-3 py-1.5 bg-[#eb9728] text-white text-xs rounded-lg font-bold hover:bg-amber-500 transition-colors"
                      >
                        Open 3D Editor
                      </button>
                    </div>
                  )}
                </>
              )}

              {isEditorOpen && baseModelUrl && (
                <div className="mt-4 rounded-xl border border-white/10 p-2 bg-white/[0.02]">
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
                      className="px-3 py-1.5 bg-white/[0.06] border border-white/10 text-white/60 text-xs rounded-lg font-bold hover:bg-white/[0.1] transition-colors"
                    >
                      Close Editor
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Images */}
            <div>
              <label className={labelClass}>Reference Images</label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 cursor-pointer hover:border-[#eb9728]/30 hover:bg-white/[0.04] transition-all group">
                <span className="material-symbols-outlined text-3xl text-white/20 group-hover:text-[#eb9728]/50 transition-colors">
                  image
                </span>
                <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                  Click to upload images
                </p>
                <p className="text-[11px] text-white/20">
                  .jpg, .jpeg, .png, .webp — multiple allowed
                </p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {images.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/8"
                    >
                      <span className="material-symbols-outlined text-[15px] text-emerald-400">
                        check_circle
                      </span>
                      <p className="text-[11px] font-semibold text-emerald-400">
                        {img.filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploading indicator */}
            {uploading && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/8">
                <div className="h-4 w-4 rounded-full border-2 border-[#eb9728]/30 border-t-[#eb9728] animate-spin shrink-0" />
                <p className="text-[11px] font-semibold text-[#eb9728]">
                  Uploading files...
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/custom-orders/${params.id}/review`)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#eb9728] text-white text-sm font-bold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_8px_24px_rgba(235,151,40,0.2)]"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    save
                  </span>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
// app/custom-orders/[id]/edit/page.js
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useParams } from "next/navigation";
// import { useSession } from "next-auth/react";
// import CustomerMainNavbar from "@/components/CustomerMainNavbar";

// export default function EditCustomOrder() {
//   const router = useRouter();
//   const params = useParams();
//   const { data: session, status } = useSession();

//   const [formData, setFormData] = useState({
//     title: "",
//     description: "",
//     quantity: 1,
//     materialPreferences: [],
//     colorSpecifications: [],
//     deadline: "",
//     specialRequirements: "",
//     budget: "",
//   });

//   const [model3D, setModel3D] = useState(null);
//   const [images, setImages] = useState([]);
//   const [uploading, setUploading] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [initialLoading, setInitialLoading] = useState(true);

//   const fetchCustomOrder = useCallback(async () => {
//     try {
//       const response = await fetch(`/api/custom-orders/${params.id}`);
//       const data = await response.json();

//       if (data.success && data.order) {
//         const order = data.order;
//         setFormData({
//           title: order.title || "",
//           description: order.description || "",
//           quantity: order.quantity || 1,
//           materialPreferences: order.materialPreferences || [],
//           colorSpecifications: order.colorSpecifications || [],
//           deadline: order.deadline ? order.deadline.split("T")[0] : "",
//           specialRequirements: order.specialRequirements || "",
//           budget: order.budget || "",
//         });
//         setModel3D(order.model3D);
//         setImages(order.images || []);
//       } else {
//         alert("Error loading order: " + (data.error || "Unknown error"));
//       }
//     } catch (error) {
//       alert("Error loading order: " + error.message);
//     } finally {
//       setInitialLoading(false);
//     }
//   }, [params.id]);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/auth/login");
//       return;
//     }
//     if (status === "authenticated") {
//       if (session.user.role !== "customer") {
//         router.push("/auth/login");
//         return;
//       }
//       fetchCustomOrder();
//     }
//   }, [status, session, router, fetchCustomOrder]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleArrayInput = (e, field) => {
//     const value = e.target.value;
//     const array = value
//       .split(",")
//       .map((item) => item.trim())
//       .filter(Boolean);
//     setFormData((prev) => ({
//       ...prev,
//       [field]: array,
//     }));
//   };

//   const handle3DUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setUploading(true);

//     try {
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("type", "3d-model");

//       const response = await fetch("/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await response.json();

//       if (data.success) {
//         setModel3D(data.file);
//       } else {
//         alert("Upload failed: " + data.error);
//       }
//     } catch (error) {
//       alert("Upload error: " + error.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleImageUpload = async (e) => {
//     const files = Array.from(e.target.files);
//     if (!files.length) return;

//     setUploading(true);

//     try {
//       const formData = new FormData();
//       files.forEach((file) => formData.append("files", file));
//       formData.append("folder", "images");

//       const response = await fetch("/api/upload/multiple", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await response.json();

//       if (data.success) {
//         setImages((prev) => [...prev, ...data.files]);
//       } else {
//         alert("Upload failed: " + data.error);
//       }
//     } catch (error) {
//       alert("Upload error: " + error.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       const response = await fetch(`/api/custom-orders/${params.id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           ...formData,
//           model3D,
//           images,
//           budget: formData.budget ? Number(formData.budget) : undefined,
//           quantity: Number(formData.quantity),
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         alert("Custom order updated!");
//         router.push(`/custom-orders/${params.id}/review`);
//       } else {
//         alert("Error: " + data.error);
//       }
//     } catch (error) {
//       alert("Error: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (status === "loading" || initialLoading)
//     return <GlobalLoader fullScreen text="Loading..." />;

//   if (status === "unauthenticated") {
//     router.push("/auth/login");
//     return null;
//   }

//   return (
//     <div className="min-h-screen bg-[#f8f7f6]">
//       <CustomerMainNavbar />
//       <div className="max-w-4xl mx-auto p-6">
//         <h1 className="text-3xl font-bold mb-6">Edit Custom Order</h1>

//         <form onSubmit={handleSubmit}>
//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Title *</label>
//             <input
//               type="text"
//               name="title"
//               value={formData.title}
//               onChange={handleChange}
//               className="w-full border p-2 rounded"
//               required
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Description *</label>
//             <textarea
//               name="description"
//               value={formData.description}
//               onChange={handleChange}
//               className="w-full border p-2 rounded h-24"
//               required
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Quantity *</label>
//             <input
//               type="number"
//               name="quantity"
//               value={formData.quantity}
//               onChange={handleChange}
//               min="1"
//               className="w-full border p-2 rounded"
//               required
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Material Preferences (comma-separated)
//             </label>
//             <input
//               type="text"
//               placeholder="Aluminum, Steel, Plastic"
//               value={formData.materialPreferences.join(", ")}
//               onChange={(e) => handleArrayInput(e, "materialPreferences")}
//               className="w-full border p-2 rounded"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Color Specifications (comma-separated)
//             </label>
//             <input
//               type="text"
//               placeholder="Black, White, Silver"
//               value={formData.colorSpecifications.join(", ")}
//               onChange={(e) => handleArrayInput(e, "colorSpecifications")}
//               className="w-full border p-2 rounded"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Deadline</label>
//             <input
//               type="date"
//               name="deadline"
//               value={formData.deadline}
//               onChange={handleChange}
//               className="w-full border p-2 rounded"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Budget ($)</label>
//             <input
//               type="number"
//               name="budget"
//               value={formData.budget}
//               onChange={handleChange}
//               className="w-full border p-2 rounded"
//               min="0"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Special Requirements
//             </label>
//             <textarea
//               name="specialRequirements"
//               value={formData.specialRequirements}
//               onChange={handleChange}
//               className="w-full border p-2 rounded h-24"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Upload 3D Model</label>
//             <input
//               type="file"
//               accept=".stl,.obj,.gltf,.glb"
//               onChange={handle3DUpload}
//               className="w-full border p-2 rounded"
//             />
//             {model3D && (
//               <div className="mt-2 p-2 bg-green-100 rounded">
//                 ✓ {model3D.filename} uploaded
//               </div>
//             )}
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Upload Images</label>
//             <input
//               type="file"
//               accept=".jpg,.jpeg,.png,.webp"
//               multiple
//               onChange={handleImageUpload}
//               className="w-full border p-2 rounded"
//             />
//             {images.length > 0 && (
//               <div className="mt-2">
//                 {images.map((img, idx) => (
//                   <div key={idx} className="p-2 bg-green-100 rounded mb-1">
//                     ✓ {img.filename}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {uploading && <p className="text-blue-600">Uploading files...</p>}

//           <div className="flex gap-4">
//             <button
//               type="button"
//               onClick={() => router.push(`/custom-orders/${params.id}/review`)}
//               className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
//             >
//               Cancel
//             </button>

//             <button
//               type="submit"
//               disabled={loading || uploading}
//               className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
//             >
//               {loading ? "Saving..." : "Save Changes"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
