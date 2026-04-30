// // app/customer/explore/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchWithCache } from "@/lib/clientCache";
import { useWishlist } from "@/lib/hooks/useWishlist";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "top_rated", label: "Top Rated" },
  { value: "most_ordered", label: "Most Ordered" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

const CATEGORIES = [
  "Electronics",
  "Metals",
  "Plastics",
  "Textiles",
  "Wood",
  "Composites",
  "Ceramics",
  "Rubber",
  "Glass",
  "Other",
];

export default function CustomerExplorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Use SWR hook for wishlist
  const { wishlistSet, toggleWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [meta, setMeta] = useState({
    categories: [],
    priceRange: { min: 0, max: 10000 },
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && session.user.role !== "customer") {
      router.push("/auth/login");
    }
  }, [status, session, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, sort, priceMin, priceMax]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, page, limit: 12 });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category) params.set("category", category);
      if (priceMin) params.set("minPrice", priceMin);
      if (priceMax) params.set("maxPrice", priceMax);

      const data = await fetchWithCache(
        `/api/products/public?${params}`,
        3 * 60 * 1000,
      );

      if (data.success) {
        setProducts(data.products);
        setPagination(data.pagination);
        setMeta(data.meta);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, sort, priceMin, priceMax, page]);

  const handleToggleWishlist = useCallback(
    async (productId) => {
      const id = productId?.toString();
      if (!id) return;
      await toggleWishlist(id, "product");
    },
    [toggleWishlist],
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchProducts();
    }
  }, [fetchProducts, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <p className="text-sm text-white/45">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const hasActiveFilters = category || priceMin || priceMax;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-7">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0c0c11] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_34%),radial-gradient(circle_at_left,rgba(235,151,40,0.13),transparent_30%)] pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                Product Marketplace
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
                Explore Products
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/55 max-w-2xl leading-7">
                Search ready-to-source manufacturing products, compare
                suppliers, and shortlist items for your next production request.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 min-w-[190px]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/35 font-bold">
                Results
              </p>
              <p className="mt-1 text-3xl font-black text-[#eb9728]">
                {loading ? "..." : pagination.total}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-white/8 bg-[#0c0c11] p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_auto] gap-3">
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 gap-3">
              <span className="material-symbols-outlined text-white/35">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name, description, or tag..."
                className="flex-1 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none bg-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-white/35 hover:text-white transition-colors"
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-2xl border border-white/10 bg-[#101017] px-4 py-3.5 text-sm text-white/80 focus:outline-none focus:border-[#eb9728]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold border transition-all ${
                showFilters
                  ? "bg-[#eb9728] text-white border-[#eb9728]"
                  : "bg-white/[0.03] text-white/75 border-white/10 hover:bg-white/[0.06] hover:text-white"
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              Filters
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-purple-400" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-white/35 uppercase tracking-[0.2em] mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#101017] px-3 py-3 text-sm text-white/80 focus:outline-none focus:border-[#eb9728]"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white/35 uppercase tracking-[0.2em] mb-2">
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder={`e.g. ${meta.priceRange.min}`}
                    className="w-full rounded-xl border border-white/10 bg-[#101017] px-3 py-3 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-white/35 uppercase tracking-[0.2em] mb-2">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder={`e.g. ${meta.priceRange.max}`}
                    className="w-full rounded-xl border border-white/10 bg-[#101017] px-3 py-3 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]"
                    min={0}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setCategory("");
                    setPriceMin("");
                    setPriceMax("");
                  }}
                  className="mt-4 text-xs font-bold text-red-300 hover:text-red-200 transition-colors"
                  type="button"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm text-white/45">
            {loading
              ? "Loading..."
              : `${pagination.total} product${pagination.total !== 1 ? "s" : ""} found`}
          </p>

          {debouncedSearch && (
            <p className="text-sm text-white/45">
              Results for{" "}
              <strong className="text-white">
                &quot;{debouncedSearch}&quot;
              </strong>
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[24px] border border-white/8 bg-[#0c0c11] overflow-hidden animate-pulse"
              >
                <div className="h-52 bg-white/[0.04]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                  <div className="h-3 bg-white/[0.06] rounded w-1/2" />
                  <div className="h-4 bg-white/[0.06] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl border border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728] flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl">
                category
              </span>
            </div>
            <h3 className="mt-6 text-2xl font-bold text-white">
              No products found
            </h3>
            <p className="text-white/50 text-sm mt-2 mb-6">
              {search
                ? `No results for "${search}"`
                : "No products available with the selected filters."}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("");
                setPriceMin("");
                setPriceMax("");
              }}
              className="px-5 py-2.5 bg-[#eb9728] text-white rounded-xl text-sm font-bold hover:bg-amber-500 transition-colors"
              type="button"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isWishlisted={wishlistSet.has(product._id?.toString())}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}

        {pagination.pages > 1 && !loading && (
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl text-sm border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-35 hover:border-[#eb9728]/40 transition-all"
              type="button"
            >
              ← Prev
            </button>

            {Array.from(
              { length: Math.min(pagination.pages, 7) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  p === page
                    ? "bg-[#eb9728] text-white border border-[#eb9728]"
                    : "bg-white/[0.03] border border-white/10 text-white/70 hover:border-[#eb9728]/40"
                }`}
                type="button"
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-4 py-2 rounded-xl text-sm border border-white/10 bg-white/[0.03] text-white/70 disabled:opacity-35 hover:border-[#eb9728]/40 transition-all"
              type="button"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function ProductCard({ product, isWishlisted, onToggleWishlist }) {
  const primaryImage =
    product.images?.find((i) => i.isPrimary) || product.images?.[0];

  return (
    <Link href={`/customer/products/${product._id}`}>
      <div className="group h-full overflow-hidden rounded-[24px] border border-white/8 bg-[#0c0c11] hover:border-[#eb9728]/25 transition-all cursor-pointer">
        <div className="relative h-52 bg-white/[0.04] overflow-hidden">
          {primaryImage?.url ? (
            <Image
              src={primaryImage.url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 20vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-white/15">
                inventory_2
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#050507]/55 via-transparent to-transparent" />

          <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#050507]/70 border border-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-white/75">
            {product.category}
          </span>
          {/* 3D badge */}
          {product.model3D?.url && (
            <span className="absolute bottom-3 left-3 px-1.5 py-0.5 bg-[#050507]/80 border border-white/10 backdrop-blur-md text-white text-[10px] font-bold rounded tracking-wide">
              3D
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist?.(product._id?.toString());
            }}
            className={`absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full border backdrop-blur-md transition-colors ${
              isWishlisted
                ? "text-[#eb9728] bg-[#050507]/80 border-[#eb9728]/40"
                : "text-white/65 bg-[#050507]/65 border-white/10 hover:text-[#eb9728] hover:border-[#eb9728]/40"
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
        </div>

        <div className="p-5">
          <h3 className="font-bold text-white text-sm mb-3 line-clamp-2 group-hover:text-[#eb9728] transition-colors min-h-[40px]">
            {product.name}
          </h3>

          <div className="flex items-center gap-2 mb-4">
            {product.manufacturerId?.businessLogo ? (
              <Image
                src={product.manufacturerId.businessLogo}
                alt=""
                width={20}
                height={20}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">
                {(product.manufacturerId?.businessName || "M").charAt(0)}
              </div>
            )}

            <p className="text-xs text-white/45 truncate">
              {product.manufacturerId?.businessName ||
                product.manufacturerId?.name}
            </p>

            {product.manufacturerId?.verificationStatus === "verified" && (
              <span className="text-purple-400" title="Verified">
                <span className="material-symbols-outlined text-xs">
                  verified
                </span>
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="text-xl font-black text-[#eb9728]">
                ${product.price?.toLocaleString()}
              </span>
              <span className="text-xs text-white/35 ml-1">/ unit</span>
            </div>

            <span className="text-[11px] text-white/55 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/8">
              MOQ: {product.moq}
            </span>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/8">
            {product.averageRating > 0 ? (
              <div className="flex items-center gap-1">
                <span className="text-[#eb9728] text-xs">★</span>
                <span className="text-xs font-bold text-white/75">
                  {product.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-white/35">
                  ({product.totalReviews})
                </span>
              </div>
            ) : (
              <span className="text-xs text-white/35">No reviews yet</span>
            )}

            {product.leadTime && (
              <span className="text-xs text-white/35">
                {product.leadTime}d lead
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
