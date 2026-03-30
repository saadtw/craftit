// app/customer/products/[id]/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { fetchWithCache } from "@/lib/clientCache";

export default function CustomerProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [product, setProduct] = useState(null);
  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const fetchManufacturer = useCallback(async (mId) => {
    try {
      // 3-min TTL — manufacturer profiles change rarely.
      const data = await fetchWithCache(
        `/api/manufacturers/${mId}`,
        3 * 60 * 1000,
      );
      if (data.success) setManufacturer(data.manufacturer);
    } catch (_) {}
  }, []);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      // 2-min TTL — product details (price, stock, status) can change.
      const data = await fetchWithCache(
        `/api/products/${id}/public`,
        2 * 60 * 1000,
      );
      if (data.success) {
        setProduct(data.product);
        if (data.product.manufacturerId) {
          fetchManufacturer(
            data.product.manufacturerId._id || data.product.manufacturerId,
          );
        }
        // Increment view count silently
        fetch(`/api/products/${id}/view`, { method: "POST" }).catch(() => {});
      } else {
        router.push("/customer/explore");
      }
    } catch (err) {
      console.error(err);
      router.push("/customer/explore");
    } finally {
      setLoading(false);
    }
  }, [id, fetchManufacturer, router]);

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
      fetchProduct();
    }
  }, [status, session, router, fetchProduct]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!product) return null;

  const primaryImage =
    product.images?.find((i) => i.isPrimary) || product.images?.[0];
  const specs = product.specifications || {};
  const dims = specs.dimensions || {};

  return (
    <div className="min-h-screen bg-[#f8f7f6]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-4">
          <Link
            href="/customer/explore"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#eb9728]"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Back to Explore
          </Link>
        </div>

        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* ── Left: Images ── */}
            <div>
              {/* Main image */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3 aspect-square relative">
                {product.images?.[activeImage]?.url ? (
                  <Image
                    src={product.images[activeImage].url}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-gray-200">
                      inventory_2
                    </span>
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {product.images?.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                        i === activeImage
                          ? "border-[#eb9728]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: Info + CTA ── */}
            <div className="flex flex-col gap-5">
              {/* Category + Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {product.category}
                </span>
                {product.subCategory && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                    {product.subCategory}
                  </span>
                )}
                {product.customizationOptions && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-medium">
                    ✦ Customizable
                  </span>
                )}
              </div>

              {/* Name */}
              <h1 className="text-2xl font-bold text-gray-900">
                {product.name}
              </h1>

              {/* Rating */}
              {product.totalReviews > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`text-lg ${
                          s <= Math.round(product.averageRating)
                            ? "text-[#eb9728]"
                            : "text-gray-200"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {product.averageRating?.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400">
                    ({product.totalReviews} reviews)
                  </span>
                </div>
              )}

              {/* Price block */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-[#eb9728]">
                    ${product.price?.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-400">per unit</span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 mt-2">
                  <span>
                    <strong className="text-gray-900">MOQ:</strong>{" "}
                    {product.moq} units
                  </span>
                  {product.leadTime && (
                    <span>
                      <strong className="text-gray-900">Lead time:</strong>{" "}
                      {product.leadTime} days
                    </span>
                  )}
                  {product.stock > 0 && (
                    <span className="text-green-600">
                      ✓ {product.stock} in stock
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Tags */}
              {product.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-col gap-2 mt-auto">
                <Link
                  href={`/customer/products/${id}/order`}
                  className="w-full py-3.5 bg-[#eb9728] text-white font-semibold text-center rounded-xl hover:bg-[#eb9728]/90 transition-colors"
                >
                  Place Order
                </Link>
                <Link
                  href={`/customer/rfqs/new?productId=${id}`}
                  className="w-full py-3.5 border-2 border-[#eb9728] text-[#eb9728] font-semibold text-center rounded-xl hover:bg-[#eb9728]/5 transition-colors"
                >
                  Request Custom Quote (RFQ)
                </Link>
              </div>
            </div>
          </div>

          {/* ── Bottom section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Specifications */}
            <div className="lg:col-span-2 space-y-6">
              {(specs.material || specs.weight || dims.length) && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                    Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {specs.material && (
                      <SpecRow label="Material" value={specs.material} />
                    )}
                    {specs.weight && (
                      <SpecRow label="Weight" value={`${specs.weight} kg`} />
                    )}
                    {specs.color?.length > 0 && (
                      <SpecRow label="Colors" value={specs.color.join(", ")} />
                    )}
                    {dims.length && (
                      <SpecRow
                        label="Dimensions"
                        value={`${dims.length} × ${dims.width} × ${dims.height} ${dims.unit || "cm"}`}
                      />
                    )}
                    {product.shippingWeight && (
                      <SpecRow
                        label="Shipping Weight"
                        value={`${product.shippingWeight} kg`}
                      />
                    )}
                    {product.leadTime && (
                      <SpecRow
                        label="Lead Time"
                        value={`${product.leadTime} days`}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 3D Model */}
              {product.model3D?.url && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    3D Model
                  </h3>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="material-symbols-outlined text-2xl text-blue-500">
                      view_in_ar
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.model3D.filename || "3D Model"}
                      </p>
                      {product.model3D.fileSize && (
                        <p className="text-xs text-gray-400">
                          {(product.model3D.fileSize / 1024 / 1024).toFixed(1)}{" "}
                          MB
                        </p>
                      )}
                    </div>
                    <a
                      href={product.model3D.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
                    >
                      View
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Manufacturer panel */}
            {manufacturer && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                  Manufacturer
                </h3>
                {/* Logo + name */}
                <div className="flex items-center gap-3 mb-4">
                  {manufacturer.businessLogo ? (
                    <Image
                      src={manufacturer.businessLogo}
                      alt=""
                      width={48}
                      height={48}
                      className="rounded-xl object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-lg">
                      {(
                        manufacturer.businessName ||
                        manufacturer.name ||
                        "M"
                      ).charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 text-sm">
                        {manufacturer.businessName || manufacturer.name}
                      </p>
                      {manufacturer.verificationStatus === "verified" && (
                        <span
                          className="text-blue-500"
                          title="Verified Manufacturer"
                        >
                          <span className="material-symbols-outlined text-base">
                            verified
                          </span>
                        </span>
                      )}
                    </div>
                    {manufacturer.location?.city && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">
                          location_on
                        </span>
                        {manufacturer.location.city},{" "}
                        {manufacturer.location.country}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <StatPill
                    label="Orders"
                    value={
                      manufacturer.completedOrders ||
                      manufacturer.stats?.completedOrders ||
                      0
                    }
                  />
                  <StatPill
                    label="Rating"
                    value={
                      manufacturer.stats?.averageRating > 0
                        ? `★ ${manufacturer.stats.averageRating.toFixed(1)}`
                        : "—"
                    }
                  />
                </div>

                {/* Capabilities */}
                {manufacturer.manufacturingCapabilities?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Capabilities
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {manufacturer.manufacturingCapabilities
                        .slice(0, 4)
                        .map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
                          >
                            {c.replace(/_/g, " ")}
                          </span>
                        ))}
                      {manufacturer.manufacturingCapabilities.length > 4 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          +{manufacturer.manufacturingCapabilities.length - 4}{" "}
                          more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <Link
                  href={`/manufacturers/${manufacturer._id}`}
                  className="block w-full py-2.5 text-center border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-[#eb9728] hover:text-[#eb9728] transition-colors"
                >
                  View Full Profile
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SpecRow({ label, value }) {
  return (
    <>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
      <p className="text-sm font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
