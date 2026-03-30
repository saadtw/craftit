// app/manufacturers/page.js
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { fetchWithCache } from "@/lib/clientCache";

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

function ManufacturerCard({ mfr }) {
  const displayName = mfr.businessName || mfr.name;
  const location = [mfr.businessAddress?.city, mfr.businessAddress?.country]
    .filter(Boolean)
    .join(", ");
  const rating = mfr.stats?.averageRating ?? 0;
  const reviews = mfr.stats?.totalReviews ?? 0;
  const completed = mfr.stats?.completedOrders ?? 0;
  const isVerified = mfr.verificationStatus === "verified";

  return (
    <Link href={`/manufacturers/${mfr._id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden hover:-translate-y-0.5 cursor-pointer h-full">
        {/* Banner */}
        <div className="relative h-28 bg-linear-to-br from-slate-100 to-slate-200 overflow-hidden">
          {mfr.businessBanner ? (
            <Image
              src={mfr.businessBanner}
              alt={`${displayName} banner`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-slate-200 via-slate-100 to-gray-200">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #94a3b8 0, #94a3b8 1px, transparent 0, transparent 50%)",
                  backgroundSize: "12px 12px",
                }}
              />
            </div>
          )}
          {isVerified && (
            <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
              <svg
                className="w-2.5 h-2.5"
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

        <div className="p-4 -mt-7 relative">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl border-2 border-white shadow-md overflow-hidden bg-white mb-3">
            {mfr.businessLogo ? (
              <Image
                src={mfr.businessLogo}
                alt={displayName}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <span className="text-amber-700 font-bold text-lg">
                  {displayName?.charAt(0)?.toUpperCase() || "M"}
                </span>
              </div>
            )}
          </div>

          <h3 className="font-bold text-gray-900 text-sm leading-tight mb-0.5 truncate">
            {displayName}
          </h3>

          {location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
              <svg
                className="w-3 h-3 shrink-0"
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
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
              {mfr.businessDescription}
            </p>
          )}

          {/* Capabilities */}
          {mfr.manufacturingCapabilities?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {mfr.manufacturingCapabilities.slice(0, 3).map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100 font-medium"
                >
                  {CAPABILITY_LABELS[cap] || cap}
                </span>
              ))}
              {mfr.manufacturingCapabilities.length > 3 && (
                <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">
                  +{mfr.manufacturingCapabilities.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5 text-amber-400 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-semibold text-gray-700">
                {rating.toFixed(1)}
              </span>
              <span className="text-gray-400">({reviews})</span>
            </div>
            <span className="text-gray-400">{completed} orders</span>
            {mfr.minOrderQuantity && (
              <span className="text-gray-400">MOQ: {mfr.minOrderQuantity}</span>
            )}
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
        // 2-minute TTL: shorter than the landing page because filters make
        // results more dynamic. A new filter/sort/page combo = new cache key.
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

  return (
    <div className="min-h-screen bg-[#f8f7f6]">
      {/* Top nav — role-agnostic */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="h-6 w-6 text-amber-600"
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
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">
              Craftit
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/customer/explore"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Products
            </Link>
            <Link
              href="/customer/group-buys"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
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
                className="text-sm font-semibold bg-[#eb9728] text-white px-4 py-1.5 rounded-full hover:bg-amber-600 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-full hover:bg-gray-700 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Manufacturers
          </h1>
          <p className="text-gray-500 text-sm">
            Browse verified hardware manufacturers ready to bring your designs
            to life.
          </p>
        </div>

        {/* Filters */}
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
              placeholder="Search manufacturers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <select
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            className="px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-[180px]"
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
            className="px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-[150px]"
          >
            <option value="rating">Top Rated</option>
            <option value="orders">Most Orders</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {!loading && (
          <p className="text-xs text-gray-400 mb-4">
            {pagination.total} manufacturer{pagination.total !== 1 ? "s" : ""}{" "}
            found
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
                <div className="h-28 bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 -mt-7" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="flex gap-1">
                    <div className="h-4 bg-gray-100 rounded-full w-16" />
                    <div className="h-4 bg-gray-100 rounded-full w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              No manufacturers found
            </h3>
            <p className="text-gray-400 text-sm">
              Try adjusting your search or filters.
            </p>
            {(search || capability) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCapability("");
                }}
                className="mt-3 text-sm text-amber-600 font-medium underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {manufacturers.map((mfr) => (
                <ManufacturerCard key={mfr._id} mfr={mfr} />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  onClick={() => fetchManufacturers(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchManufacturers(pagination.page + 1)}
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

export default function ManufacturersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ManufacturersPageContent />
    </Suspense>
  );
}
