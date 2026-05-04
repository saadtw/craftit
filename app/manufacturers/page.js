// app/manufacturers/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { fetchWithCache } from "@/lib/clientCache";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";

const CAPABILITIES = [
  "CNC_Machining",
  "3D_Printing",
  "Injection_Molding",
  "Sheet_Metal",
  "Casting",
  "Welding",
  "Assembly",
  "Finishing",
  "Prototyping",
  "Mass_Production",
];

const CAPABILITY_LABELS = {
  CNC_Machining: "CNC Machining",
  "3D_Printing": "3D Printing",
  Injection_Molding: "Injection Molding",
  Sheet_Metal: "Sheet Metal",
  Casting: "Casting",
  Welding: "Welding",
  Assembly: "Assembly",
  Finishing: "Finishing",
  Prototyping: "Prototyping",
  Mass_Production: "Mass Production",
};

function ManufacturerCard({ mfr, isWishlisted, onToggleWishlist }) {
  const displayName = mfr.businessName || mfr.name;
  const location = [mfr.businessAddress?.city, mfr.businessAddress?.country]
    .filter(Boolean)
    .join(", ");
  const rating = mfr.stats?.averageRating ?? 0;
  const reviews = mfr.stats?.totalReviews ?? 0;
  const completed = mfr.stats?.completedOrders ?? 0;
  const isVerified = mfr.verificationStatus === "verified";
  const manufacturerId = mfr._id?.toString();

  return (
    <Link href={`/manufacturers/${mfr._id}`}>
      <div className="group relative h-full cursor-pointer overflow-hidden rounded-[24px] border border-white/8 bg-[#0c0c11] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#eb9728]/40 hover:bg-white/[0.025]">
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist(manufacturerId);
            }}
            className={`absolute left-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
              isWishlisted
                ? "border-[#eb9728]/40 bg-[#050507]/80 text-[#eb9728]"
                : "border-white/10 bg-[#050507]/65 text-white/65 hover:border-[#eb9728]/40 hover:text-[#eb9728]"
            }`}
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-label={
              isWishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
          >
            <span className="material-symbols-outlined text-lg">
              {isWishlisted ? "favorite" : "favorite_border"}
            </span>
          </button>
        )}

        <div className="relative h-28 overflow-hidden bg-white/[0.04]">
          {mfr.businessBanner ? (
            <Image
              src={mfr.businessBanner}
              alt={`${displayName} banner`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.20),transparent_36%),radial-gradient(circle_at_left,rgba(235,151,40,0.16),transparent_32%),#111118]" />
          )}

          {isVerified && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/15 px-2 py-0.5 text-[10px] font-black text-blue-300 shadow">
              <svg
                className="h-2.5 w-2.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </div>
          )}
        </div>

        <div className="relative -mt-7 p-4">
          <div className="mb-3 h-14 w-14 overflow-hidden rounded-xl border-2 border-[#0c0c11] bg-white/[0.04] shadow-md">
            {mfr.businessLogo ? (
              <Image
                src={mfr.businessLogo}
                alt={displayName}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#eb9728]/10">
                <span className="text-lg font-black text-[#eb9728]">
                  {displayName?.charAt(0)?.toUpperCase() || "M"}
                </span>
              </div>
            )}
          </div>

          <h3 className="mb-0.5 truncate text-sm font-black leading-tight text-white transition-colors group-hover:text-[#eb9728]">
            {displayName}
          </h3>

          {location && (
            <p className="mb-2 flex items-center gap-1 text-xs text-white/35">
              <svg
                className="h-3 w-3 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {location}
            </p>
          )}

          {mfr.businessDescription && (
            <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-white/45">
              {mfr.businessDescription}
            </p>
          )}

          {mfr.manufacturingCapabilities?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {mfr.manufacturingCapabilities.slice(0, 3).map((cap) => (
                <span
                  key={cap}
                  className="rounded-full border border-[#eb9728]/20 bg-[#eb9728]/10 px-2 py-0.5 text-[10px] font-bold text-[#eb9728]"
                >
                  {CAPABILITY_LABELS[cap] || cap}
                </span>
              ))}
              {mfr.manufacturingCapabilities.length > 3 && (
                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40">
                  +{mfr.manufacturingCapabilities.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/8 pt-3 text-xs text-white/40">
            <div className="flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5 fill-current text-[#eb9728]"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-bold text-white/70">
                {rating.toFixed(1)}
              </span>
              <span>({reviews})</span>
            </div>

            <span>{completed} orders</span>

            {mfr.minOrderQuantity && <span>MOQ: {mfr.minOrderQuantity}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ManufacturersPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [capability, setCapability] = useState(
    searchParams.get("capability") || "",
  );
  const [sort, setSort] = useState("rating");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [wishlistManufacturerIds, setWishlistManufacturerIds] = useState(
    new Set(),
  );

  const fetchWishlist = useCallback(async () => {
    if (session?.user?.role !== "customer") return;
    try {
      const response = await fetch("/api/users/wishlist", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = await response.json();
      const ids = (data?.wishlist || [])
        .filter((item) => item.itemType === "manufacturer" && item._id)
        .map((item) => item._id.toString());

      setWishlistManufacturerIds(new Set(ids));
    } catch (_) {}
  }, [session?.user?.role]);

  const handleToggleWishlist = useCallback(
    async (manufacturerId) => {
      const targetId = manufacturerId?.toString();
      if (!targetId || session?.user?.role !== "customer") return;

      const isCurrentlyWishlisted = wishlistManufacturerIds.has(targetId);

      setWishlistManufacturerIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyWishlisted) next.delete(targetId);
        else next.add(targetId);
        return next;
      });

      try {
        const response = await fetch("/api/users/wishlist", {
          method: isCurrentlyWishlisted ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: targetId,
            itemType: "manufacturer",
          }),
        });

        if (!response.ok && response.status !== 409) {
          throw new Error("Wishlist update failed");
        }
      } catch (_) {
        setWishlistManufacturerIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlyWishlisted) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
      }
    },
    [wishlistManufacturerIds, session?.user?.role],
  );

  const fetchManufacturers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sort,
          page,
          limit: 12,
          ...(search && { search }),
          ...(capability && { capability }),
        });

        const data = await fetchWithCache(
          `/api/manufacturers/public?${params}`,
          2 * 60 * 1000,
        );

        if (data.success) {
          setManufacturers(data.manufacturers);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [sort, search, capability],
  );

  useEffect(() => {
    fetchManufacturers(1);
  }, [fetchManufacturers]);

  useEffect(() => {
    if (session?.user?.role === "customer") fetchWishlist();
  }, [session?.user?.role, fetchWishlist]);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {session?.user?.role === "customer" ? (
        <CustomerMainNavbar />
      ) : (
        <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#0c0c11]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2">
              <svg
                className="h-6 w-6 text-[#eb9728]"
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
              <span className="text-lg font-black tracking-tight text-white">
                Craftit
              </span>
            </Link>

            <div className="flex items-center gap-5">
              <Link
                href="/customer/explore"
                className="text-sm font-semibold text-white/50 transition-colors hover:text-white"
              >
                Products
              </Link>
              <Link
                href="/customer/group-buys"
                className="text-sm font-semibold text-white/50 transition-colors hover:text-white"
              >
                Group Buys
              </Link>

              {session ? (
                <Link
                  href={
                    session.user.role === "manufacturer"
                      ? "/manufacturer/dashboard"
                      : "/customer/dashboard"
                  }
                  className="rounded-full bg-[#eb9728] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-500"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 hover:border-[#eb9728]/40 hover:text-[#eb9728]"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-7xl px-5 py-10">
        <section className="relative mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.13),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
              Manufacturer Network
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Manufacturers
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Browse verified hardware manufacturers ready to bring your designs
              to life.
            </p>
          </div>
        </section>

        <section className="mb-5 rounded-[24px] border border-white/8 bg-[#0c0c11] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
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
                placeholder="Search manufacturers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:border-[#eb9728] focus:outline-none"
              />
            </div>

            <select
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              className="min-w-[180px] rounded-2xl border border-white/10 bg-[#101017] px-4 py-3 text-sm text-white/80 focus:border-[#eb9728] focus:outline-none"
            >
              <option value="">All Capabilities</option>
              {CAPABILITIES.map((c) => (
                <option key={c} value={c}>
                  {CAPABILITY_LABELS[c]}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-w-[150px] rounded-2xl border border-white/10 bg-[#101017] px-4 py-3 text-sm text-white/80 focus:border-[#eb9728] focus:outline-none"
            >
              <option value="rating">Top Rated</option>
              <option value="orders">Most Orders</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </section>

        {!loading && (
          <p className="mb-4 text-xs text-white/35">
            {pagination.total} manufacturer{pagination.total !== 1 ? "s" : ""}{" "}
            found
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0c0c11] animate-pulse"
              >
                <div className="h-28 bg-white/[0.04]" />
                <div className="space-y-3 p-4">
                  <div className="-mt-7 h-14 w-14 rounded-xl bg-white/[0.06]" />
                  <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
                  <div className="h-3 w-full rounded bg-white/[0.06]" />
                  <div className="flex gap-1">
                    <div className="h-4 w-16 rounded-full bg-white/[0.06]" />
                    <div className="h-4 w-16 rounded-full bg-white/[0.06]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : manufacturers.length === 0 ? (
          <GlobalNoResults text="No manufacturers found" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {manufacturers.map((mfr) => (
                <ManufacturerCard
                  key={mfr._id}
                  mfr={mfr}
                  isWishlisted={wishlistManufacturerIds.has(
                    mfr._id?.toString(),
                  )}
                  onToggleWishlist={
                    session?.user?.role === "customer"
                      ? handleToggleWishlist
                      : undefined
                  }
                />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="mt-10 flex justify-center gap-2">
                <button
                  onClick={() => fetchManufacturers(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 hover:border-[#eb9728]/40 hover:text-[#eb9728] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <span className="px-4 py-2 text-sm text-white/40">
                  Page {pagination.page} of {pagination.pages}
                </span>

                <button
                  onClick={() => fetchManufacturers(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 hover:border-[#eb9728]/40 hover:text-[#eb9728] disabled:cursor-not-allowed disabled:opacity-40"
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

export default function ManufacturersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050507]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#eb9728]" />
        </div>
      }
    >
      <ManufacturersPageContent />
    </Suspense>
  );
}

