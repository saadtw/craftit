"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";

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

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [meta, setMeta] = useState({
    categories: [],
    priceRange: { min: 0, max: 10000 },
  });

  // Filters
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
  }, [status, session]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
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

      const res = await fetch(`/api/products/public?${params}`);
      const data = await res.json();
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

  useEffect(() => {
    if (status === "authenticated") fetchProducts();
  }, [fetchProducts, status]);

  if (status === "loading") {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      <CustomerSidebar active="explore" session={session} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Explore Products</h1>
          <div className="flex items-center gap-4">
            <button className="relative text-gray-900 hover:text-[#eb9728]">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl px-4 gap-2 shadow-sm">
              <span className="material-symbols-outlined text-gray-400">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name, description, or tag..."
                className="flex-1 py-3 text-sm focus:outline-none bg-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm shadow-sm focus:outline-none focus:border-[#eb9728]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border shadow-sm transition-colors ${
                showFilters
                  ? "bg-[#eb9728] text-white border-[#eb9728]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-[#eb9728]"
              }`}
            >
              <span className="material-symbols-outlined text-base">tune</span>
              Filters
              {(category || priceMin || priceMax) && (
                <span className="w-2 h-2 rounded-full bg-white inline-block" />
              )}
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#eb9728]"
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder={`e.g. ${meta.priceRange.min}`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#eb9728]"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder={`e.g. ${meta.priceRange.max}`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#eb9728]"
                    min={0}
                  />
                </div>
              </div>
              {(category || priceMin || priceMax) && (
                <button
                  onClick={() => {
                    setCategory("");
                    setPriceMin("");
                    setPriceMax("");
                  }}
                  className="mt-3 text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Result count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {loading
                ? "Loading..."
                : `${pagination.total} product${pagination.total !== 1 ? "s" : ""} found`}
            </p>
            {debouncedSearch && (
              <p className="text-sm text-gray-500">
                Results for <strong>&quot;{debouncedSearch}&quot;</strong>
              </p>
            )}
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-gray-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-3 block">
                category
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-500 text-sm mb-4">
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
                className="px-4 py-2 bg-[#eb9728] text-white rounded-lg text-sm font-medium hover:bg-[#eb9728]/90"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && !loading && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white disabled:opacity-40 hover:border-[#eb9728]"
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-[#eb9728] text-white border border-[#eb9728]"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-[#eb9728]"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages, p + 1))
                }
                disabled={page === pagination.pages}
                className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white disabled:opacity-40 hover:border-[#eb9728]"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({ product }) {
  const primaryImage =
    product.images?.find((i) => i.isPrimary) || product.images?.[0];

  return (
    <Link href={`/customer/products/${product._id}`}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#eb9728]/40 transition-all group overflow-hidden cursor-pointer">
        {/* Image */}
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {primaryImage?.url ? (
            <Image
              src={primaryImage.url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 20vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                inventory_2
              </span>
            </div>
          )}
          {/* Category badge */}
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded-full text-xs font-medium text-gray-600">
            {product.category}
          </span>
          {product.isWishlisted && (
            <span className="absolute top-2 right-2 text-[#eb9728]">
              <span className="material-symbols-outlined text-lg">
                favorite
              </span>
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-[#eb9728] transition-colors">
            {product.name}
          </h3>

          {/* Manufacturer */}
          <div className="flex items-center gap-1.5 mb-2">
            {product.manufacturerId?.businessLogo ? (
              <Image
                src={product.manufacturerId.businessLogo}
                alt=""
                width={16}
                height={16}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                {(product.manufacturerId?.businessName || "M").charAt(0)}
              </div>
            )}
            <p className="text-xs text-gray-500 truncate">
              {product.manufacturerId?.businessName ||
                product.manufacturerId?.name}
            </p>
            {product.manufacturerId?.verificationStatus === "verified" && (
              <span className="text-blue-500" title="Verified">
                <span className="material-symbols-outlined text-xs">
                  verified
                </span>
              </span>
            )}
          </div>

          {/* Price + MOQ */}
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-lg font-bold text-[#eb9728]">
                ${product.price?.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 ml-1">/ unit</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              MOQ: {product.moq}
            </span>
          </div>

          {/* Rating + lead time */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            {product.averageRating > 0 ? (
              <div className="flex items-center gap-1">
                <span className="text-[#eb9728] text-xs">★</span>
                <span className="text-xs font-medium text-gray-700">
                  {product.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({product.totalReviews})
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">No reviews yet</span>
            )}
            {product.leadTime && (
              <span className="text-xs text-gray-400">
                {product.leadTime}d lead
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

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
