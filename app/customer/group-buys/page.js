// app/customer/group-buys/page.js
// app/customer/group-buys/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { fetchWithCache } from "@/lib/clientCache";

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

function CountdownPill({ endDate }) {
  const t = useCountdown(endDate);

  if (t.done) {
    return (
      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300">
        Ended
      </span>
    );
  }

  return (
    <span className="rounded-full border border-[#eb9728]/25 bg-[#050507]/75 px-2.5 py-1 font-mono text-[11px] font-bold text-[#eb9728] backdrop-blur-md">
      {t.days > 0 ? `${t.days}d ` : ""}
      {String(t.hours).padStart(2, "0")}:{String(t.minutes).padStart(2, "0")}:
      {String(t.seconds).padStart(2, "0")}
    </span>
  );
}

function GroupBuyCard({ gb }) {
  const maxTier = gb.tiers[gb.tiers.length - 1];
  const activeTier =
    gb.currentTierIndex >= 0 ? gb.tiers[gb.currentTierIndex] : null;
  const has3DModel = Boolean(gb.productId?.model3D?.url);
  const displayPrice = gb.currentDiscountedPrice ?? gb.basePrice;
  const maxQty = maxTier?.minQuantity || 1;
  const pct = Math.min((gb.currentQuantity / maxQty) * 100, 100);

  return (
    <Link href={`/customer/group-buys/${gb._id}`}>
      <div className="group h-full overflow-hidden rounded-[26px] border border-white/8 bg-[#0c0c11] transition-all duration-300 hover:-translate-y-1 hover:border-[#eb9728]/25">
        <div className="relative h-52 overflow-hidden bg-white/4">
          {gb.productId?.images?.[0]?.url ? (
            <Image
              src={gb.productId.images[0].url}
              alt={gb.productId.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-white/15">
                inventory_2
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#050507]/70 via-transparent to-transparent" />

          {activeTier && (
            <div className="absolute left-3 top-3 rounded-full bg-[#eb9728] px-3 py-1 text-xs font-black text-white">
              {activeTier.discountPercent}% OFF
            </div>
          )}

          <div className="absolute right-3 top-3">
            <CountdownPill endDate={gb.endDate} />
          </div>
          {has3DModel && (
            <div className="absolute bottom-3 right-3">
              <span className="px-2 py-0.5 rounded-full bg-[#050507]/80 border border-white/10 backdrop-blur-md text-white text-[10px] font-bold">
                3D Model
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#eb9728]">
            {gb.productId?.category || "Product"}
          </p>

          <h3 className="mb-2 min-h-[42px] text-sm font-bold leading-snug text-white line-clamp-2 group-hover:text-[#eb9728] transition-colors">
            {gb.title}
          </h3>

          <p className="mb-4 truncate text-xs text-white/40">
            by{" "}
            {gb.manufacturerId?.businessName ||
              gb.manufacturerId?.name ||
              "Manufacturer"}
          </p>

          <div className="mb-4 flex items-end gap-2">
            <span className="text-2xl font-black text-white">
              ${displayPrice.toFixed(2)}
            </span>
            {activeTier && (
              <span className="text-sm text-white/30 line-through">
                ${gb.basePrice.toFixed(2)}
              </span>
            )}
            <span className="ml-auto text-xs text-white/35">/unit</span>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="font-semibold text-white/70">
                {gb.currentParticipantCount} joined
              </span>
              <span className="text-white/40">
                {gb.currentQuantity} / {maxQty} units
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#eb9728] to-purple-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {gb.tiers.map((tier, i) => {
              const unlocked = gb.currentQuantity >= tier.minQuantity;

              return (
                <span
                  key={i}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                    unlocked
                      ? "border-[#eb9728]/25 bg-[#eb9728]/10 text-[#eb9728]"
                      : "border-white/8 bg-white/[0.03] text-white/35"
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

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace("/auth/login");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#eb9728]" />
          <GlobalLoader text="Loading group buys..." />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 space-y-7">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0c0c11] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_34%),radial-gradient(circle_at_left,rgba(235,151,40,0.13),transparent_30%)] pointer-events-none" />

          <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                Group Buying Marketplace
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Group Buys
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
                Join fellow buyers and unlock better prices together. The more
                people join, the bigger the discount for everyone.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 min-w-[190px]">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
                Active Deals
              </p>
              <p className="mt-1 text-3xl font-black text-[#eb9728]">
                {loading ? "..." : pagination.total}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-white/8 bg-[#0c0c11] p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px]">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                search
              </span>
              <input
                type="text"
                placeholder="Search group buys..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/30 focus:border-[#eb9728] focus:outline-none"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cursor-pointer rounded-2xl border border-white/10 bg-[#101017] px-4 py-3.5 text-sm text-white/80 focus:border-[#eb9728] focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="ending_soon">Ending Soon</option>
              <option value="participants">Most Popular</option>
              <option value="discount">Biggest Discount</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat === "All" ? "" : cat)}
                className={`rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${
                  (cat === "All" && !category) || cat === category
                    ? "border-[#eb9728] bg-[#eb9728] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:border-[#eb9728]/35 hover:text-white"
                }`}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {!loading && (
          <p className="text-sm text-white/45">
            {pagination.total} active group{" "}
            {pagination.total === 1 ? "buy" : "buys"} found
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[26px] border border-white/8 bg-[#0c0c11] animate-pulse"
              >
                <div className="h-52 bg-white/[0.04]" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
                  <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                  <div className="h-6 w-1/3 rounded bg-white/[0.06]" />
                  <div className="h-2 rounded-full bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : groupBuys.length === 0 ? (
          <div className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-12 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]">
              <span className="material-symbols-outlined text-5xl">groups</span>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">
              No group buys found
            </h3>
            <p className="mx-auto max-w-sm text-sm text-white/45">
              {search || category
                ? "Try adjusting your search or filters."
                : "No active group buys at the moment. Check back soon."}
            </p>

            {(search || category) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("");
                }}
                className="mt-5 rounded-xl bg-[#eb9728] px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500"
                type="button"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupBuys.map((gb) => (
                <GroupBuyCard key={gb._id} gb={gb} />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                <button
                  onClick={() => fetchGroupBuys(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-all hover:border-[#eb9728]/40 disabled:cursor-not-allowed disabled:opacity-35"
                  type="button"
                >
                  ← Previous
                </button>

                <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/45">
                  Page {pagination.page} of {pagination.pages}
                </span>

                <button
                  onClick={() => fetchGroupBuys(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-all hover:border-[#eb9728]/40 disabled:cursor-not-allowed disabled:opacity-35"
                  type="button"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
