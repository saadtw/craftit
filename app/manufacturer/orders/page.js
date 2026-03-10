"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const STATUS_COLORS = {
  pending_acceptance: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_production: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  disputed: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS = {
  pending_acceptance: "Pending Acceptance",
  accepted: "Accepted",
  in_production: "In Production",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const TYPE_LABELS = {
  rfq: "RFQ Order",
  product: "Product Order",
  group_buy: "Group Buy",
};

export default function ManufacturerOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchOrders(1);
    }
  }, [status, session, activeFilter]);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (activeFilter !== "all") params.set("status", activeFilter);

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
        setStats(data.stats || {});
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerId?.name?.toLowerCase().includes(q) ||
      o.productDetails?.name?.toLowerCase().includes(q)
    );
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "oldest")
      return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "value_high")
      return (b.totalPrice || 0) - (a.totalPrice || 0);
    if (sortBy === "value_low")
      return (a.totalPrice || 0) - (b.totalPrice || 0);
    return 0;
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <div className="text-xl text-gray-600">Loading orders...</div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "manufacturer") {
    return null;
  }

  const filterTabs = [
    { key: "all", label: "All Orders", count: stats.total },
    {
      key: "pending_acceptance",
      label: "Pending",
      count: stats.pending_acceptance,
    },
    { key: "accepted", label: "Accepted", count: stats.accepted },
    {
      key: "in_production",
      label: "In Production",
      count: stats.in_production,
    },
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "cancelled", label: "Cancelled", count: stats.cancelled },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link
              href="/manufacturer/dashboard"
              className="flex items-center gap-2"
            >
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
              <h2 className="text-xl font-bold text-blue-900">Craftit</h2>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/manufacturer/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                Dashboard
              </Link>
              <Link
                href="/manufacturer/products"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                Products
              </Link>
              <Link
                href="/manufacturer/orders"
                className="text-sm font-bold text-orange-500"
              >
                Orders
              </Link>
              <Link
                href="/manufacturer/rfqs"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                RFQs
              </Link>
              <Link
                href="/manufacturer/bids"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                My Bids
              </Link>
              <Link
                href="/manufacturer/group-buys"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                Group Buys
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-blue-900 mb-1">
            Orders Management
          </h1>
          <p className="text-gray-600">
            Manage and track all your customer orders
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total || 0, color: "text-blue-900" },
            {
              label: "Pending",
              value: stats.pending_acceptance || 0,
              color: "text-yellow-600",
            },
            {
              label: "Accepted",
              value: stats.accepted || 0,
              color: "text-blue-600",
            },
            {
              label: "In Production",
              value: stats.in_production || 0,
              color: "text-purple-600",
            },
            {
              label: "Completed",
              value: stats.completed || 0,
              color: "text-green-600",
            },
            {
              label: "Cancelled",
              value: stats.cancelled || 0,
              color: "text-red-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center"
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters + Search + Sort */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          {/* Filter Tabs */}
          <div className="border-b border-gray-200 px-4">
            <div className="flex gap-1 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeFilter === tab.key
                      ? "border-orange-500 text-orange-500"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        activeFilter === tab.key
                          ? "bg-orange-100 text-orange-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search and sort row */}
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-3 gap-2">
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search by order ID, customer name, or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="value_high">Sort: Value (High → Low)</option>
              <option value="value_low">Sort: Value (Low → High)</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {sortedOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No orders found
            </h3>
            <p className="text-gray-500">
              {activeFilter === "all"
                ? "You don't have any orders yet. Win bids to start receiving orders."
                : `No orders with status "${STATUS_LABELS[activeFilter] || activeFilter}".`}
            </p>
            {activeFilter !== "all" && (
              <button
                onClick={() => setActiveFilter("all")}
                className="mt-4 px-4 py-2 text-sm text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50"
              >
                View all orders
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onRefresh={() => fetchOrders(pagination.page)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => fetchOrders(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p === pagination.page
                      ? "bg-orange-500 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-white/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © 2026 Craftit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function OrderCard({ order, onRefresh }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleQuickAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error || "Failed to accept order");
    } catch (err) {
      alert("Error accepting order");
    } finally {
      setAccepting(false);
    }
  };

  const handleQuickReject = async () => {
    const reason = prompt("Reason for rejection (optional):");
    setRejecting(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          rejectionReason: reason || "Rejected by manufacturer",
        }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error || "Failed to reject order");
    } catch (err) {
      alert("Error rejecting order");
    } finally {
      setRejecting(false);
    }
  };

  const completedMilestones =
    order.milestones?.filter((m) => m.status === "completed").length || 0;
  const totalMilestones = order.milestones?.length || 0;
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-blue-900">
                  {order.orderNumber}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {TYPE_LABELS[order.orderType] || order.orderType}
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {order.productDetails?.name || "Custom Order"}
              </h3>
            </div>
            <span className="text-lg font-bold text-orange-500">
              ${order.totalPrice?.toLocaleString() || "—"}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <span className="text-gray-500">Customer</span>
              <p className="font-medium text-gray-900">
                {order.customerId?.name || "—"}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Quantity</span>
              <p className="font-medium text-gray-900">
                {order.quantity} units
              </p>
            </div>
            <div>
              <span className="text-gray-500">Order Date</span>
              <p className="font-medium text-gray-900">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Est. Delivery</span>
              <p className="font-medium text-gray-900">
                {order.estimatedDeliveryDate
                  ? new Date(order.estimatedDeliveryDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
          </div>

          {/* Production progress bar (if has milestones) */}
          {totalMilestones > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Production Progress</span>
                <span>
                  {completedMilestones}/{totalMilestones} milestones ·{" "}
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-row md:flex-col gap-2 md:min-w-[150px] justify-end">
          <Link
            href={`/manufacturer/orders/${order._id}`}
            className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 text-center"
          >
            View Details
          </Link>

          {order.status === "pending_acceptance" && (
            <>
              <button
                onClick={handleQuickAccept}
                disabled={accepting}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {accepting ? "..." : "✓ Accept"}
              </button>
              <button
                onClick={handleQuickReject}
                disabled={rejecting}
                className="px-4 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                {rejecting ? "..." : "✗ Reject"}
              </button>
            </>
          )}

          {order.status === "accepted" && (
            <Link
              href={`/manufacturer/orders/${order._id}/milestones`}
              className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg hover:bg-purple-200 text-center"
            >
              Manage Milestones
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
