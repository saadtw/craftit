"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  out_of_stock: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-600",
};

const STATUS_ACTIONS = {
  active: [
    {
      status: "draft",
      label: "Unpublish",
      style: "border-slate-200 text-slate-600 hover:bg-slate-50",
    },
    {
      status: "out_of_stock",
      label: "Mark Out of Stock",
      style: "border-amber-200 text-amber-600 hover:bg-amber-50",
    },
    {
      status: "archived",
      label: "Archive",
      style: "border-red-200 text-red-600 hover:bg-red-50",
    },
  ],
  draft: [
    {
      status: "active",
      label: "Publish",
      style: "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
    },
    {
      status: "archived",
      label: "Archive",
      style: "border-red-200 text-red-600 hover:bg-red-50",
    },
  ],
  out_of_stock: [
    {
      status: "active",
      label: "Mark Available",
      style: "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
    },
    {
      status: "draft",
      label: "Set as Draft",
      style: "border-slate-200 text-slate-600 hover:bg-slate-50",
    },
  ],
  archived: [
    {
      status: "draft",
      label: "Restore to Draft",
      style: "border-slate-200 text-slate-600 hover:bg-slate-50",
    },
  ],
};

export default function ProductDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.product);
          // Set primary image as default
          const primaryIdx = data.product.images?.findIndex((i) => i.isPrimary);
          if (primaryIdx > 0) setActiveImage(primaryIdx);
        } else {
          router.push("/manufacturer/products");
        }
      } catch (_) {
        router.push("/manufacturer/products");
      }
      setLoading(false);
    };
    if (status === "authenticated") fetchProduct();
  }, [id, status, router]);

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    setShowStatusMenu(false);
    try {
      const res = await fetch(`/api/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setProduct((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (_) {}
    setStatusLoading(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Archive this product? It will be hidden from customers but you can restore it later.",
      )
    )
      return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) router.push("/manufacturer/products");
    } catch (_) {}
    setDeleteLoading(false);
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const specs = product.specifications || {};
  const dims = specs.dimensions || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/manufacturer/products"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 line-clamp-1">
                {product.name}
              </h1>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[product.status]}`}
              >
                {product.status.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status change dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu((v) => !v)}
                disabled={statusLoading}
                className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {statusLoading ? (
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                )}
                Change Status
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                  {(STATUS_ACTIONS[product.status] || []).map((a) => (
                    <button
                      key={a.status}
                      onClick={() => handleStatusChange(a.status)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href={`/manufacturer/products/${id}/edit`}
              className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Images + Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="aspect-video bg-slate-100 flex items-center justify-center">
                {product.images?.length > 0 ? (
                  <img
                    src={product.images[activeImage]?.url}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-slate-200 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-slate-400 text-sm">No images uploaded</p>
                  </div>
                )}
              </div>

              {product.images?.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImage === idx
                          ? "border-slate-900"
                          : "border-transparent hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3D Model */}
            {product.model3D?.url && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-slate-900 text-white text-xs rounded font-medium">
                    3D
                  </span>
                  3D Model Available
                </h3>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {product.model3D.filename}
                    </p>
                    {product.model3D.fileSize && (
                      <p className="text-xs text-slate-400">
                        {(product.model3D.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                  <a
                    href={product.model3D.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Description
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Specifications
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                {specs.material && (
                  <div>
                    <dt className="text-xs text-slate-400">Material</dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {specs.material}
                    </dd>
                  </div>
                )}
                {dims.length || dims.width || dims.height ? (
                  <div>
                    <dt className="text-xs text-slate-400">Dimensions</dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {dims.length} × {dims.width} × {dims.height} {dims.unit}
                    </dd>
                  </div>
                ) : null}
                {specs.weight ? (
                  <div>
                    <dt className="text-xs text-slate-400">Weight</dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {specs.weight} kg
                    </dd>
                  </div>
                ) : null}
                {product.shippingWeight ? (
                  <div>
                    <dt className="text-xs text-slate-400">Shipping Weight</dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {product.shippingWeight} kg
                    </dd>
                  </div>
                ) : null}
                {product.leadTime ? (
                  <div>
                    <dt className="text-xs text-slate-400">Lead Time</dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {product.leadTime} days
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-slate-400">Customization</dt>
                  <dd className="text-sm font-medium text-slate-900 mt-0.5">
                    {product.customizationOptions
                      ? "✓ Available"
                      : "Not available"}
                  </dd>
                </div>
              </dl>

              {specs.color?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">
                    Available Colors
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specs.color.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">
            {/* Pricing */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-3xl font-bold text-slate-900">
                  ${product.price?.toLocaleString()}
                </p>
                <span className="text-sm text-slate-400">per unit</span>
              </div>
              <p className="text-sm text-slate-500">
                MOQ:{" "}
                <span className="font-semibold text-slate-700">
                  {product.moq} units
                </span>
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Stock</span>
                  <span
                    className={`font-medium ${product.stock === 0 ? "text-red-500" : "text-slate-900"}`}
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} units`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Category</span>
                  <span className="font-medium text-slate-900">
                    {product.category}
                  </span>
                </div>
                {product.subCategory && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Sub-category</span>
                    <span className="font-medium text-slate-900">
                      {product.subCategory}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Performance
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Total Views",
                    value: product.views?.toLocaleString() || "0",
                    icon: "👁",
                  },
                  {
                    label: "Total Orders",
                    value: product.totalOrders?.toLocaleString() || "0",
                    icon: "📦",
                  },
                  {
                    label: "Avg Rating",
                    value: product.averageRating
                      ? `${product.averageRating}/5`
                      : "No ratings yet",
                    icon: "⭐",
                  },
                  {
                    label: "Total Reviews",
                    value: product.totalReviews?.toLocaleString() || "0",
                    icon: "💬",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <span>{stat.icon}</span>
                      {stat.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SEO */}
            {(product.seoTitle || product.seoDescription) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  SEO
                </h3>
                {product.seoTitle && (
                  <div className="mb-2">
                    <p className="text-xs text-slate-400">Title</p>
                    <p className="text-sm text-slate-700 mt-0.5">
                      {product.seoTitle}
                    </p>
                  </div>
                )}
                {product.seoDescription && (
                  <div>
                    <p className="text-xs text-slate-400">Description</p>
                    <p className="text-sm text-slate-700 mt-0.5">
                      {product.seoDescription}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Dates
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-slate-700">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Updated</span>
                  <span className="text-slate-700">
                    {new Date(product.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close status menu */}
      {showStatusMenu && (
        <div
          className="fixed inset-0 z-[1]"
          onClick={() => setShowStatusMenu(false)}
        />
      )}
    </div>
  );
}
