"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";

export default function CustomerProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [product, setProduct] = useState(null);
  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

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
  }, [status, session]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      // Use the public products API with a product ID filter
      // We'll load both product + manufacturer in parallel via the public manufacturer endpoint
      const res = await fetch(`/api/products/${id}/public`);
      const data = await res.json();
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
  };

  const fetchManufacturer = async (mId) => {
    try {
      const res = await fetch(`/api/manufacturers/${mId}`);
      const data = await res.json();
      if (data.success) setManufacturer(data.manufacturer);
    } catch (_) {}
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar />
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
    <div className="flex h-screen bg-[#f8f7f6]">
      <CustomerSidebar active="explore" session={session} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Link
              href="/customer/explore"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#eb9728]"
            >
              <span className="material-symbols-outlined text-base">
                arrow_back
              </span>
              Back to Explore
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500 truncate max-w-xs">
              {product.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
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

function CustomerSidebar({ active, session }) {
  const navItems = [
    {
      href: "/customer/dashboard",
      icon: "home",
      label: "Dashboard",
      key: "dashboard",
    },
    {
      href: "/customer/explore",
      icon: "storefront",
      label: "Explore Products",
      key: "explore",
    },
    {
      href: "/customer/custom-orders",
      icon: "inventory_2",
      label: "My Custom Orders",
      key: "custom-orders",
    },
    { href: "/customer/rfqs", icon: "gavel", label: "My RFQs", key: "rfqs" },
    {
      href: "/customer/orders",
      icon: "receipt_long",
      label: "Orders History",
      key: "orders",
    },
    {
      href: "#",
      icon: "favorite",
      label: "Wishlist",
      key: "wishlist",
      disabled: true,
    },
    {
      href: "#",
      icon: "mail",
      label: "Messages",
      key: "messages",
      disabled: true,
    },
    {
      href: "#",
      icon: "payments",
      label: "Payments",
      key: "payments",
      disabled: true,
    },
    {
      href: "#",
      icon: "settings",
      label: "Settings",
      key: "settings",
      disabled: true,
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#f8f7f6] p-6 flex flex-col justify-between border-r border-gray-200">
      <div>
        <div className="mb-10">
          <svg
            className="h-8 w-8 text-amber-600"
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.177,14.686,21.5,4.2a3,3,0,0,1,3,0l17.323,10.485a3,3,0,0,1,1.5,2.6V30.714a3,3,0,0,1-1.5,2.6L24.5,43.8a3,3,0,0,1-3,0L4.177,33.314a3,3,0,0,1-1.5-2.6V17.286a3,3,0,0,1,1.5-2.6Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="m22.5,24,14.5-8.5M22.5,24V43.5M22.5,24,9,16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Craftit</h1>
        </div>
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                item.disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : active === item.key
                    ? "bg-[#eb9728]/20 text-[#eb9728]"
                    : "text-gray-700 hover:bg-[#eb9728]/10"
              }`}
              title={item.disabled ? "Coming soon" : undefined}
            >
              <span className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <LogoutButton />
    </aside>
  );
}
