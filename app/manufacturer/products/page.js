// app/manufacturer/products/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Drafts" },
  { key: "out_of_stock", label: "Out of Stock" },
  { key: "archived", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Viewed" },
  { value: "orders", label: "Most Ordered" },
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

const STATUS_STYLES = {
  active: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
  draft: "bg-white/5 border border-white/10 text-white/40",
  out_of_stock: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  archived: "bg-red-500/10 border border-red-500/20 text-red-400",
};

export default function ManufacturerProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  // Bulk
  const [selected, setSelected] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Status change loading
  const [statusLoading, setStatusLoading] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSelected([]);
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab, debouncedSearch, sort, category]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/products/stats");
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (_) {}
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 12,
        sort,
        ...(activeTab !== "all" && { status: activeTab }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(category && { category }),
      });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setPagination(data.pagination);
      }
    } catch (_) {}
    setLoading(false);
  }, [page, sort, activeTab, debouncedSearch, category]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      const t = setTimeout(() => {
        fetchStats();
        fetchProducts();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [status, fetchStats, fetchProducts]);

  const handleStatusChange = async (productId, newStatus) => {
    setStatusLoading(productId);
    try {
      const res = await fetch(`/api/products/${productId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => {
          if (activeTab !== "all" && activeTab !== newStatus) {
            // also deselect the removed product
            setSelected((sel) => sel.filter((sid) => sid !== productId));
            return prev.filter((p) => p._id !== productId);
          }
          return prev.map((p) =>
            p._id === productId ? { ...p, status: newStatus } : p,
          );
        });
        fetchStats();
      }
    } catch (_) {}
    setStatusLoading(null);
  };

  const handleDelete = async (productId, currentStatus) => {
    if (currentStatus === "archived") {
      if (!confirm("Permanently delete this product? This cannot be undone."))
        return;
      try {
        const res = await fetch(`/api/products/${productId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          setProducts((prev) => prev.filter((p) => p._id !== productId));
          setSelected((sel) => sel.filter((sid) => sid !== productId));
          fetchStats();
        }
      } catch (_) {}
    } else {
      if (!confirm("Archive this product? It will be hidden from customers."))
        return;
      await handleStatusChange(productId, "archived");
    }
  };

  const handleBulkAction = async (action) => {
    if (selected.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, productIds: selected }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected([]);
        fetchProducts();
        fetchStats();
      }
    } catch (_) {}
    setBulkLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === products.length) setSelected([]);
    else setSelected(products.map((p) => p._id));
  };

  const exportCSV = () => {
    const rows = [
      [
        "Name",
        "Category",
        "Price",
        "MOQ",
        "Stock",
        "Status",
        "Views",
        "Orders",
      ],
      ...products.map((p) => [
        p.name,
        p.category,
        p.price,
        p.moq,
        p.stock,
        p.status,
        p.views,
        p.totalOrders,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalog.csv";
    a.click();
  };

  if (status === "loading") {
    return <GlobalLoader fullScreen text="SYNCHRONIZING CATALOG..." />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <div className="bg-white/[0.02] border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-indigo-400">
              Product Catalog
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 border border-white/10 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
            <Link
              href="/manufacturer/products/new"
              className="px-4 py-2 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:scale-105 transition-all flex items-center gap-1.5"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Product
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Products",
                value: stats.total,
                color: "text-white",
              },
              {
                label: "Active",
                value: stats.active,
                color: "text-emerald-400",
              },
              { label: "Drafts", value: stats.draft, color: "text-white/40" },
              {
                label: "Out of Stock",
                value: stats.out_of_stock,
                color: "text-amber-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="relative p-[2px] rounded-2xl bg-gradient-to-br from-[#eb9728] via-purple-600 to-indigo-500 group transition-all duration-500 hover:scale-[1.02]"
              >
                <div className="bg-[#0a0a0c] rounded-[14px] p-3.5 h-full flex flex-col items-center justify-center text-center backdrop-blur-xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1.5">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color} tracking-tighter`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters Section - Standalone Elements */}
        <div className="space-y-6 relative z-40">
          {/* Search + Dropdowns Row */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full group">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-purple-400 transition-colors"
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
                placeholder="Search by product name, category or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/20 text-sm tracking-wide transition-all"
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
              <CustomDropdown
                value={category}
                onChange={setCategory}
                options={[{ value: "", label: "All Categories" }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
                placeholder="Category"
              />
              <CustomDropdown
                value={sort}
                onChange={setSort}
                options={SORT_OPTIONS}
                placeholder="Sort By"
              />
            </div>
          </div>

          {/* Status Tabs Navigation - Standalone Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-full p-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar backdrop-blur-md">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-full transition-all flex-shrink-0 ${
                  activeTab === tab.key
                    ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                    : "text-white/30 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
                {stats && tab.key !== "all" && stats[tab.key] !== undefined && (
                  <span className="ml-1 opacity-40">({tab.key === "archived" ? stats.archived : stats[tab.key]})</span>
                )}
                {tab.key === "all" && pagination.total > 0 && (
                  <span className="ml-1 opacity-40">({pagination.total})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.length > 0 && (
          <div className="bg-purple-600 text-white rounded-2xl px-6 py-3 flex items-center justify-between animate-in slide-in-from-bottom-2 shadow-[0_0_25px_rgba(147,51,234,0.3)]">
            <span className="text-[10px] font-black uppercase tracking-widest">
              {selected.length} product(s) selected
            </span>
            <div className="flex items-center gap-2">
              {[
                {
                  action: "publish",
                  label: "Publish",
                  style: "bg-emerald-500 hover:bg-emerald-400",
                },
                {
                  action: "draft",
                  label: "Set Draft",
                  style: "bg-white/10 hover:bg-white/20",
                },
                {
                  action: "out_of_stock",
                  label: "Out of Stock",
                  style: "bg-amber-500 hover:bg-amber-400",
                },
                {
                  action: "archive",
                  label: "Archive",
                  style: "bg-red-500 hover:bg-red-400",
                },
              ].map((a) => (
                <button
                  key={a.action}
                  onClick={() => handleBulkAction(a.action)}
                  disabled={bulkLoading}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${a.style} disabled:opacity-50`}
                >
                  {a.label}
                </button>
              ))}
              <button
                onClick={() => setSelected([])}
                className="p-1.5 hover:bg-black/20 rounded-lg transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/[0.03] rounded-2xl border-2 border-purple-500/20 overflow-hidden animate-pulse"
              >
                <div className="h-44 bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/40 py-20 text-center backdrop-blur-md">
            <GlobalNoResults text="No products found" />
            <p className="text-white/20 text-sm mt-1">
              {debouncedSearch
                ? "Try a different search term"
                : "Add your first product to get started"}
            </p>
            {!debouncedSearch && (
              <Link
                href="/manufacturer/products/new"
                className="inline-flex items-center gap-1.5 mt-6 px-6 py-2 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:scale-105 transition-all"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Product
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
              <input
                type="checkbox"
                checked={
                  selected.length === products.length && products.length > 0
                }
                onChange={toggleSelectAll}
                className="rounded border-white/20 bg-white/5"
              />
              <span>Select all on this page</span>
              <span className="ml-auto">{pagination.total} product(s) available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  selected={selected.includes(product._id)}
                  onSelect={() => toggleSelect(product._id)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  statusLoading={statusLoading === product._id}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-xl disabled:opacity-20 hover:bg-white/5 transition-all"
                >
                  Previous
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 px-4">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={page === pagination.pages}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-xl disabled:opacity-20 hover:bg-white/5 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  selected,
  onSelect,
  onStatusChange,
  onDelete,
  statusLoading,
}) {
  const primaryImage =
    product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;

  const nextStatusOptions = {
    draft: [{ status: "active", label: "Publish" }],
    active: [
      { status: "draft", label: "Unpublish" },
      { status: "out_of_stock", label: "Mark OOS" },
    ],
    out_of_stock: [
      { status: "active", label: "Mark Available" },
      { status: "draft", label: "Set Draft" },
    ],
    archived: [{ status: "draft", label: "Restore" }],
  };

  return (
    <div
      className={`bg-white/[0.03] rounded-2xl border-2 transition-all overflow-hidden group backdrop-blur-md h-full flex flex-col ${
        selected
          ? "border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.2)]"
          : "border-purple-500/40 hover:border-purple-500/60"
      }`}
    >
      {/* Image */}
      <div className="relative h-44 bg-black/40 overflow-hidden">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 left-3 z-10 rounded border-white/20 bg-white/5 w-4 h-4 cursor-pointer"
        />
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
            <svg
              className="w-10 h-10 text-white/5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full backdrop-blur-md ${STATUS_STYLES[product.status]}`}
        >
          {product.status.replace("_", " ")}
        </span>
        {product.model3D?.url && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded shadow-lg">
            3D READY
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-black text-white text-sm leading-snug line-clamp-1 uppercase tracking-tight">
          {product.name}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mt-1">{product.category}</p>

        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-xl font-black text-white tracking-tighter">
              ${product.price?.toLocaleString()}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">MOQ: {product.moq}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20">{product.views} views</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
              {product.totalOrders} orders
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-auto pt-4">
          <a
            href={`/manufacturer/products/${product._id}`}
            className="flex-1 text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/40 border border-white/5 rounded-lg hover:bg-white/5 hover:text-white transition-all"
          >
            View
          </a>
          <a
            href={`/manufacturer/products/${product._id}/edit`}
            className="flex-1 text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/40 border border-white/5 rounded-lg hover:bg-white/5 hover:text-white transition-all"
          >
            Edit
          </a>
          {nextStatusOptions[product.status]?.[0] && (
            <button
              onClick={() =>
                onStatusChange(
                  product._id,
                  nextStatusOptions[product.status][0].status,
                )
              }
              disabled={statusLoading}
              className="flex-1 text-center px-2 py-1.5 text-[9px] font-black uppercase tracking-widest bg-purple-600 text-white rounded-lg shadow-[0_0_10px_rgba(147,51,234,0.2)] hover:scale-105 transition-all disabled:opacity-50"
            >
              {statusLoading
                ? "..."
                : nextStatusOptions[product.status][0].label}
            </button>
          )}
          <button
            onClick={() => onDelete(product._id, product.status)}
            className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title={
              product.status === "archived" ? "Delete permanently" : "Archive"
            }
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
function CustomDropdown({ value, options, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full sm:w-48 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.08] transition-all text-white group"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg
          className={`w-4 h-4 text-white/20 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full sm:w-56 bg-[#0B011D] border-2 border-purple-500/30 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${
                  value === opt.value
                    ? "bg-purple-600 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
