// app/manufacturers/[id]/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";
import CustomerSidebar from "@/components/CustomerSidebar";
import { fetchWithCache } from "@/lib/clientCache";

function ManufacturerSidebar({ active, session }) {
  const navItems = [
    {
      href: "/manufacturer/dashboard",
      icon: "home",
      label: "Dashboard",
      key: "dashboard",
    },
    {
      href: "/manufacturer/products",
      icon: "inventory_2",
      label: "Products",
      key: "products",
    },
    {
      href: "/manufacturer/orders",
      icon: "receipt_long",
      label: "Orders",
      key: "orders",
    },
    {
      href: "/manufacturer/rfqs",
      icon: "gavel",
      label: "RFQs & Bidding",
      key: "rfqs",
    },
    {
      href: "/manufacturer/bids",
      icon: "handshake",
      label: "My Bids",
      key: "bids",
    },
    {
      href: "/manufacturer/group-buys",
      icon: "group",
      label: "Group Buys",
      key: "group-buys",
    },
    {
      href: session?.user?.id ? `/manufacturers/${session.user.id}` : "#",
      icon: "storefront",
      label: "My Profile",
      key: "profile",
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
                  ? "text-gray-400 cursor-not-allowed pointer-events-none"
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

// ─── Public top nav (for unauthenticated visitors) ────────────────────────────
function PublicTopNav({ manufacturer }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#eb9728] transition-colors"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Home
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">
          {manufacturer?.businessName || manufacturer?.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/auth/signup"
          className="text-sm font-bold bg-[#eb9728] text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </header>
  );
}

// ─── StatItem ─────────────────────────────────────────────────────────────────
function StatItem({ value, label }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

export default function ManufacturerPublicProfilePage() {
  const { id } = useParams();
  const { data: session, status } = useSession();

  const [manufacturer, setManufacturer] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      // 3-min TTL — profile data (description, capabilities, stats) changes slowly.
      const data = await fetchWithCache(
        `/api/manufacturers/${id}`,
        3 * 60 * 1000,
      );
      if (data.success) {
        setManufacturer(data.manufacturer);
        setProducts(data.products || []);
      }
      // Don't redirect on failure — just show nothing (handled below)
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Page is public — don't block on auth status
    // Only skip fetch if session is still loading (avoid double-fetch)
    if (status !== "loading") {
      fetchProfile();
    }
  }, [status, fetchProfile]);

  const role = session?.user?.role;

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        {role === "manufacturer" ? (
          <ManufacturerSidebar session={session} />
        ) : role === "customer" ? (
          <CustomerSidebar session={session} />
        ) : null}
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        {role === "manufacturer" ? (
          <ManufacturerSidebar session={session} />
        ) : role === "customer" ? (
          <CustomerSidebar session={session} />
        ) : null}
        <main className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-gray-500">Manufacturer not found.</p>
          <Link
            href="/manufacturers"
            className="text-sm text-[#eb9728] font-medium hover:underline"
          >
            ← Browse Manufacturers
          </Link>
        </main>
      </div>
    );
  }

  const isPublic = !role; // unauthenticated visitor

  return (
    <div className={`flex ${isPublic ? "flex-col" : "h-screen"} bg-[#f8f7f6]`}>
      {/* Sidebar or nothing */}
      {role === "manufacturer" && (
        <ManufacturerSidebar active="profile" session={session} />
      )}
      {role === "customer" && (
        <CustomerSidebar active="explore" session={session} />
      )}

      <main className={`flex-1 ${isPublic ? "" : "overflow-y-auto"}`}>
        {/* Header — authenticated gets the inner header; public gets top nav */}
        {isPublic ? (
          <PublicTopNav manufacturer={manufacturer} />
        ) : (
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center gap-3">
              {role === "manufacturer" ? (
                <Link
                  href="/manufacturer/dashboard"
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#eb9728]"
                >
                  <span className="material-symbols-outlined text-base">
                    arrow_back
                  </span>
                  Back to Dashboard
                </Link>
              ) : (
                <Link
                  href="/customer/explore"
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#eb9728]"
                >
                  <span className="material-symbols-outlined text-base">
                    arrow_back
                  </span>
                  Back to Explore
                </Link>
              )}
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">
                {manufacturer.businessName || manufacturer.name}
              </span>
            </div>
            <div className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </header>
        )}

        {/* Banner */}
        <div className="relative h-40 bg-linear-to-r from-blue-600 to-blue-900 overflow-hidden">
          {manufacturer.businessBanner && (
            <Image
              src={manufacturer.businessBanner}
              alt=""
              fill
              className="object-cover opacity-70"
              sizes="100vw"
            />
          )}
        </div>

        {/* Profile header */}
        <div className="bg-white border-b border-gray-200 px-8 pb-0">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end gap-5 -mt-8 pb-5">
              {/* Logo */}
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white shrink-0 relative">
                {manufacturer.businessLogo ? (
                  <Image
                    src={manufacturer.businessLogo}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-3xl">
                    {(
                      manufacturer.businessName ||
                      manufacturer.name ||
                      "M"
                    ).charAt(0)}
                  </div>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">
                    {manufacturer.businessName || manufacturer.name}
                  </h1>
                  {manufacturer.verificationStatus === "verified" && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-medium">
                      <span className="material-symbols-outlined text-xs">
                        verified
                      </span>
                      Verified
                    </span>
                  )}
                </div>
                {manufacturer.location?.city && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-sm">
                      location_on
                    </span>
                    {manufacturer.location.city}
                    {manufacturer.location.state &&
                      `, ${manufacturer.location.state}`}
                    {manufacturer.location.country &&
                      `, ${manufacturer.location.country}`}
                  </p>
                )}
              </div>

              {/* CTAs — role-aware */}
              {role === "customer" && (
                <Link
                  href={`/customer/rfqs/new?manufacturerId=${id}`}
                  className="shrink-0 px-5 py-2.5 bg-[#eb9728] text-white rounded-xl text-sm font-semibold hover:bg-[#eb9728]/90 transition-colors"
                >
                  Send RFQ
                </Link>
              )}
              {role === "manufacturer" && session?.user?.id === id && (
                <Link
                  href="/manufacturer/products"
                  className="shrink-0 px-5 py-2.5 border border-[#eb9728] text-[#eb9728] rounded-xl text-sm font-semibold hover:bg-[#eb9728]/10 transition-colors"
                >
                  Manage Products
                </Link>
              )}
              {isPublic && (
                <Link
                  href={`/auth/login?redirect=/manufacturers/${id}`}
                  className="shrink-0 px-5 py-2.5 bg-[#eb9728] text-white rounded-xl text-sm font-semibold hover:bg-[#eb9728]/90 transition-colors"
                >
                  Login to Order
                </Link>
              )}
            </div>

            {/* Stats bar */}
            <div className="flex gap-6 pb-4 border-b border-gray-100">
              <StatItem
                value={manufacturer.stats?.completedOrders || 0}
                label="Completed Orders"
              />
              <StatItem
                value={
                  manufacturer.stats?.averageRating > 0
                    ? `★ ${manufacturer.stats.averageRating.toFixed(1)}`
                    : "—"
                }
                label="Rating"
              />
              <StatItem
                value={manufacturer.stats?.totalReviews || 0}
                label="Reviews"
              />
              {manufacturer.minOrderQuantity && (
                <StatItem
                  value={`${manufacturer.minOrderQuantity}+`}
                  label="Min Order Qty"
                />
              )}
              <StatItem value={products.length} label="Active Products" />
            </div>

            {/* Tabs */}
            <div className="flex gap-6 pt-1">
              {["products", "about", "capabilities"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-[#eb9728] text-[#eb9728]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-8 max-w-5xl mx-auto">
          {/* Products tab */}
          {activeTab === "products" && (
            <>
              {products.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">
                    inventory_2
                  </span>
                  <p className="text-gray-500 text-sm">
                    This manufacturer has no active products listed yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {products.map((product) => {
                    const img =
                      product.images?.find((i) => i.isPrimary) ||
                      product.images?.[0];
                    // Customers and public go to customer product page; manufacturer goes to their product page
                    const productHref =
                      role === "manufacturer"
                        ? `/manufacturer/products/${product._id}`
                        : `/customer/products/${product._id}`;
                    return (
                      <Link key={product._id} href={productHref}>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#eb9728]/40 transition-all group overflow-hidden">
                          <div className="h-44 bg-gray-100 overflow-hidden relative">
                            {img?.url ? (
                              <Image
                                src={img.url}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="25vw"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-gray-300">
                                  inventory_2
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <p className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1 group-hover:text-[#eb9728] transition-colors">
                              {product.name}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-base font-bold text-[#eb9728]">
                                ${product.price?.toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-400">
                                MOQ: {product.moq}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* About tab */}
          {activeTab === "about" && (
            <div className="space-y-5">
              {manufacturer.businessDescription && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    About
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {manufacturer.businessDescription}
                  </p>
                </div>
              )}
              {manufacturer.certifications?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {manufacturer.certifications.map((c) => (
                      <span
                        key={c}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium"
                      >
                        <span className="material-symbols-outlined text-xs">
                          workspace_premium
                        </span>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {manufacturer.budgetRange?.min && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Budget Range
                  </h3>
                  <p className="text-sm text-gray-600">
                    ${manufacturer.budgetRange.min.toLocaleString()} — $
                    {manufacturer.budgetRange.max?.toLocaleString() || "Open"}
                  </p>
                </div>
              )}
              {!manufacturer.businessDescription &&
                !manufacturer.certifications?.length &&
                !manufacturer.budgetRange?.min && (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-400 text-sm">
                      No about details listed yet.
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Capabilities tab */}
          {activeTab === "capabilities" && (
            <div className="space-y-5">
              {manufacturer.manufacturingCapabilities?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                    Manufacturing Capabilities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {manufacturer.manufacturingCapabilities.map((c) => (
                      <span
                        key={c}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium"
                      >
                        {c.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {manufacturer.materialsAvailable?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                    Materials Available
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {manufacturer.materialsAvailable.map((m) => (
                      <span
                        key={m}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-sm"
                      >
                        {m.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!manufacturer.manufacturingCapabilities?.length &&
                !manufacturer.materialsAvailable?.length && (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-400 text-sm">
                      No capability details listed yet.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
