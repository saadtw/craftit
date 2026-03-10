"use client";

import { useState, useEffect, useCallback } from "react";
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
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  out_of_stock: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-600",
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected([]);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchStats();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProducts();
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/manufacturer/dashboard"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Product Catalog
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
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
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Products",
                value: stats.total,
                color: "text-slate-900",
              },
              {
                label: "Active",
                value: stats.active,
                color: "text-emerald-600",
              },
              { label: "Drafts", value: stats.draft, color: "text-slate-500" },
              {
                label: "Out of Stock",
                value: stats.out_of_stock,
                color: "text-amber-600",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters Row */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          {/* Status Tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {stats && tab.key !== "all" && stats[tab.key] !== undefined && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {tab.key === "archived" ? stats.archived : stats[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search + Sort + Category */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.length > 0 && (
          <div className="bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <span className="text-sm font-medium">
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
                  style: "bg-slate-600 hover:bg-slate-500",
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${a.style} disabled:opacity-50`}
                >
                  {a.label}
                </button>
              ))}
              <button
                onClick={() => setSelected([])}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
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
                className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse"
              >
                <div className="h-44 bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
            <svg
              className="w-12 h-12 text-slate-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="text-slate-500 font-medium">No products found</p>
            <p className="text-slate-400 text-sm mt-1">
              {debouncedSearch
                ? "Try a different search term"
                : "Add your first product to get started"}
            </p>
            {!debouncedSearch && (
              <Link
                href="/manufacturer/products/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
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
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <input
                type="checkbox"
                checked={
                  selected.length === products.length && products.length > 0
                }
                onChange={toggleSelectAll}
                className="rounded border-slate-300"
              />
              <span>Select all on this page</span>
              <span className="ml-auto">{pagination.total} product(s)</span>
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
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={page === pagination.pages}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
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
      className={`bg-white rounded-xl border transition-all overflow-hidden group ${
        selected
          ? "border-slate-900 ring-2 ring-slate-900 ring-opacity-20"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Image */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 left-3 z-10 rounded border-slate-300 w-4 h-4"
        />
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-slate-300"
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
          className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[product.status]}`}
        >
          {product.status.replace("_", " ")}
        </span>
        {product.model3D?.url && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-slate-800 text-white text-xs rounded font-medium">
            3D
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">{product.category}</p>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-base font-bold text-slate-900">
              ${product.price?.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">MOQ: {product.moq}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">{product.views} views</p>
            <p className="text-xs text-slate-400">
              {product.totalOrders} orders
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <a
            href={`/manufacturer/products/${product._id}`}
            className="flex-1 text-center px-2 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            View
          </a>
          <a
            href={`/manufacturer/products/${product._id}/edit`}
            className="flex-1 text-center px-2 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
              className="flex-1 text-center px-2 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {statusLoading
                ? "..."
                : nextStatusOptions[product.status][0].label}
            </button>
          )}
          <button
            onClick={() => onDelete(product._id, product.status)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
