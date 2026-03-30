// app/customer/group-buys/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { fetchWithCache } from "@/lib/clientCache";

// ─── Countdown helper ───────────────────────────────────────────────────────
function useCountdown(endDate) {
  const calc = useCallback(() => {
    if (!endDate)
      return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    const diff = new Date(endDate) - Date.now();
    if (diff <= 0)
      return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: false,
    };
  }, [endDate]);
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return time;
}

// ─── Tier progress bar ───────────────────────────────────────────────────────
function TierBar({ tiers, currentQuantity }) {
  const maxQty = tiers[tiers.length - 1]?.minQuantity || 1;
  const pct = Math.min((currentQuantity / maxQty) * 100, 100);
  const activeTierIdx = [...tiers]
    .reverse()
    .findIndex((t) => currentQuantity >= t.minQuantity);
  const activeIdx =
    activeTierIdx === -1 ? -1 : tiers.length - 1 - activeTierIdx;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{currentQuantity} units</span>
        <span>Goal: {maxQty} units</span>
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        {tiers.map((tier, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-0.5 bg-white"
            style={{ left: `${(tier.minQuantity / maxQty) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ width: "33%" }}
          >
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                i <= activeIdx
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {tier.discountPercent}% off
            </span>
            <span className="text-[9px] text-gray-400 mt-0.5">
              {tier.minQuantity}+ units
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Countdown pill ──────────────────────────────────────────────────────────
function CountdownPill({ endDate }) {
  const t = useCountdown(endDate);
  if (t.done)
    return <span className="text-xs text-red-500 font-medium">Ended</span>;
  return (
    <span className="text-xs font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
      {t.days > 0 ? `${t.days}d ` : ""}
      {String(t.hours).padStart(2, "0")}:{String(t.minutes).padStart(2, "0")}:
      {String(t.seconds).padStart(2, "0")}
    </span>
  );
}

// ─── Group Buy Card ──────────────────────────────────────────────────────────
function GroupBuyCard({ gb }) {
  const maxTier = gb.tiers[gb.tiers.length - 1];
  const activeTier =
    gb.currentTierIndex >= 0 ? gb.tiers[gb.currentTierIndex] : null;
  const displayPrice = gb.currentDiscountedPrice ?? gb.basePrice;
  const maxQty = maxTier?.minQuantity || 1;
  const pct = Math.min((gb.currentQuantity / maxQty) * 100, 100);

  return (
    <Link href={`/customer/group-buys/${gb._id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-0.5">
        {/* Product Image */}
        <div className="relative h-44 bg-gray-50 overflow-hidden">
          {gb.productId?.images?.[0] ? (
            <Image
              src={gb.productId.images[0]}
              alt={gb.productId.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          )}
          {/* Discount badge */}
          {activeTier && (
            <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
              {activeTier.discountPercent}% OFF
            </div>
          )}
          {/* Countdown */}
          <div className="absolute top-3 right-3">
            <CountdownPill endDate={gb.endDate} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
            {gb.productId?.category || "Product"}
          </p>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
            {gb.title}
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            by{" "}
            {gb.manufacturerId?.businessName ||
              gb.manufacturerId?.name ||
              "Manufacturer"}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-bold text-gray-900">
              ${displayPrice.toFixed(2)}
            </span>
            {activeTier && (
              <span className="text-sm text-gray-400 line-through">
                ${gb.basePrice.toFixed(2)}
              </span>
            )}
            <span className="text-xs text-gray-500 ml-auto">/unit</span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-medium text-gray-700">
                {gb.currentParticipantCount} joined
              </span>
              <span>
                {gb.currentQuantity} / {maxQty} units
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background:
                    pct >= 100
                      ? "#22c55e"
                      : pct >= 50
                        ? "linear-gradient(90deg, #f59e0b, #eb9728)"
                        : "linear-gradient(90deg, #fcd34d, #f59e0b)",
                }}
              />
            </div>
          </div>

          {/* Tier chips */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {gb.tiers.map((tier, i) => {
              const unlocked = gb.currentQuantity >= tier.minQuantity;
              return (
                <span
                  key={i}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    unlocked
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  }`}
                >
                  {tier.discountPercent}% @ {tier.minQuantity}+
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CustomerGroupBuysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [groupBuys, setGroupBuys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const categories = [
    "All",
    "Electronics",
    "Mechanical Parts",
    "Plastics",
    "Metal Fabrication",
    "Woodwork",
    "Textiles",
    "3D Printed",
    "Other",
  ];

  const fetchGroupBuys = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sort,
          page,
          limit: 12,
          ...(search && { search }),
          ...(category && category !== "All" && { category }),
        });
        // 2-min TTL — shorter since participant counts update frequently.
        const data = await fetchWithCache(
          `/api/group-buys/public?${params}`,
          2 * 60 * 1000,
        );
        if (data.success) {
          setGroupBuys(data.groupBuys);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [sort, search, category],
  );

  useEffect(() => {
    fetchGroupBuys(1);
  }, [fetchGroupBuys]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#f8f7f6] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    router.replace("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f6] flex">
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Group Buys</h1>
          <p className="text-gray-500 text-sm mt-1">
            Join fellow buyers and unlock better prices together — the more
            people join, the bigger the discount.
          </p>
        </div>

        {/* Search + Sort bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search group buys…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none cursor-pointer min-w-40"
          >
            <option value="newest">Newest First</option>
            <option value="ending_soon">Ending Soon</option>
            <option value="participants">Most Popular</option>
            <option value="discount">Biggest Discount</option>
          </select>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === "All" ? "" : cat)}
              className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                (cat === "All" && !category) || cat === category
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-gray-400 mb-4">
            {pagination.total} active group{" "}
            {pagination.total === 1 ? "buy" : "buys"} found
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse"
              >
                <div className="h-44 bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-6 bg-gray-100 rounded w-1/3" />
                  <div className="h-2 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : groupBuys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              No group buys found
            </h3>
            <p className="text-gray-400 text-sm max-w-xs">
              {search || category
                ? "Try adjusting your search or filters."
                : "No active group buys at the moment. Check back soon!"}
            </p>
            {(search || category) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("");
                }}
                className="mt-4 text-sm text-amber-600 font-medium underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {groupBuys.map((gb) => (
                <GroupBuyCard key={gb._id} gb={gb} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  onClick={() => fetchGroupBuys(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchGroupBuys(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
