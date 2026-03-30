// app/customer/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchWithCache } from "@/lib/clientCache";

const WORKSPACE_LINKS = [
  { href: "/customer/dashboard", icon: "monitoring", label: "Dashboard" },
  { href: "/customer/orders", icon: "receipt_long", label: "Orders" },
  { href: "/customer/rfqs", icon: "gavel", label: "RFQs" },
  { href: "/customer/wishlist", icon: "favorite", label: "Wishlist" },
  { href: "/customer/settings", icon: "settings", label: "Settings" },
  { href: "/customer/payments", icon: "payments", label: "Payments" },
];

function currency(value) {
  if (typeof value !== "number") return "-";
  return `$${value.toLocaleString()}`;
}

function daysLeft(dateString) {
  if (!dateString) return 0;
  const ms = new Date(dateString).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function CustomerHomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeGroupBuys, setActiveGroupBuys] = useState([]);
  const [featuredManufacturers, setFeaturedManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productsData, groupBuysData, manufacturersData] =
        await Promise.all([
          fetchWithCache("/api/products/public?sort=popular&limit=6", 180000),
          fetchWithCache(
            "/api/group-buys/public?sort=participants&limit=4",
            120000,
          ),
          fetchWithCache(
            "/api/manufacturers/public?sort=rating&limit=4",
            300000,
          ),
        ]);

      setFeaturedProducts(
        productsData?.success ? productsData.products || [] : [],
      );
      setActiveGroupBuys(
        groupBuysData?.success ? groupBuysData.groupBuys || [] : [],
      );
      setFeaturedManufacturers(
        manufacturersData?.success ? manufacturersData.manufacturers || [] : [],
      );
    } catch (err) {
      console.error("Customer home fetch error:", err);
      setError("Could not load marketplace data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchHomeData();
    }
  }, [status, session, router, fetchHomeData]);

  const firstName = useMemo(
    () => session?.user?.name?.split(" ")[0] || "there",
    [session?.user?.name],
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-[#eb9728] animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "customer") {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#f9fbff] via-[#f6f7fb] to-[#f3f4f7]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-8">
        <section className="rounded-3xl p-6 sm:p-8 bg-linear-to-r from-[#121826] via-[#1b2436] to-[#2a3248] text-white shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
            Marketplace Home
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            Discover top products, join active group buys, and shortlist trusted
            manufacturers. Use your dashboard for account-specific tracking and
            settings.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href="/customer/explore"
              className="px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100"
            >
              Browse Products
            </Link>
            <Link
              href="/customer/group-buys"
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20"
            >
              View Group Buys
            </Link>
            <Link
              href="/manufacturers"
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20"
            >
              Find Manufacturers
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">
            My Workspace
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {WORKSPACE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:border-[#eb9728]/40 hover:shadow transition-all"
              >
                <span className="material-symbols-outlined text-[#eb9728] text-xl">
                  {item.icon}
                </span>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {item.label}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {error && (
          <section className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">
              Trending Products
            </h2>
            <Link
              href="/customer/explore"
              className="text-xs font-semibold text-[#eb9728] hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.slice(0, 6).map((product) => (
              <div
                key={product._id}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {product.category || "General"}
                </p>
                <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-8">
                  {product.description ||
                    "High-quality manufacturing-ready item."}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-400">Starting at</p>
                    <p className="text-sm font-bold text-gray-900">
                      {currency(product.price)}
                    </p>
                  </div>
                  <Link
                    href={`/customer/products/${product._id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#eb9728]/10 text-[#eb9728] hover:bg-[#eb9728]/20"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">
              Live Group Buys
            </h2>
            <Link
              href="/customer/group-buys"
              className="text-xs font-semibold text-[#eb9728] hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroupBuys.slice(0, 4).map((groupBuy) => {
              const quantity = groupBuy.currentQuantity || 0;
              const nextTier = groupBuy.tiers?.find(
                (tier) => tier.minQuantity > quantity,
              );
              const unitsToNextTier = nextTier
                ? Math.max(nextTier.minQuantity - quantity, 0)
                : 0;

              return (
                <div
                  key={groupBuy._id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">
                        {groupBuy.title ||
                          groupBuy.productId?.name ||
                          "Group Buy"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {groupBuy.manufacturerId?.businessName ||
                          groupBuy.manufacturerId?.name ||
                          "Manufacturer"}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {daysLeft(groupBuy.endDate)}d left
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                    <span>
                      {groupBuy.currentParticipantCount || 0} participants
                    </span>
                    <span className="font-semibold text-[#eb9728]">
                      {currency(
                        groupBuy.currentDiscountedPrice ?? groupBuy.basePrice,
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {unitsToNextTier > 0
                      ? `${unitsToNextTier} more units to unlock next tier`
                      : "Top tier unlocked"}
                  </p>

                  <Link
                    href={`/customer/group-buys/${groupBuy._id}`}
                    className="mt-3 inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#eb9728]/10 text-[#eb9728] hover:bg-[#eb9728]/20"
                  >
                    Open Group Buy
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">
              Featured Manufacturers
            </h2>
            <Link
              href="/manufacturers"
              className="text-xs font-semibold text-[#eb9728] hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredManufacturers.slice(0, 4).map((mfr) => (
              <div
                key={mfr._id}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-[#eb9728]/15 text-[#eb9728] flex items-center justify-center font-bold">
                  {(mfr.businessName || mfr.name || "M")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900 line-clamp-1">
                  {mfr.businessName || mfr.name}
                </h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                  {mfr.manufacturingCapabilities?.[0]?.replace(/_/g, " ") ||
                    "General Manufacturing"}
                </p>
                <p className="mt-1 text-xs text-gray-400 line-clamp-1">
                  {mfr.businessAddress?.country ||
                    mfr.location?.country ||
                    "Global"}
                </p>
                <Link
                  href={`/manufacturers/${mfr._id}`}
                  className="mt-3 inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
