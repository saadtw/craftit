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
  rfq: "RFQ",
  product: "Product",
  group_buy: "Group Buy",
};

export default function CustomerOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchOrders();
    }
  }, [status, session, activeFilter, typeFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") params.set("status", activeFilter);
      if (typeFilter !== "all") params.set("orderType", typeFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
        setStats(data.stats || {});
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
      o.manufacturerId?.businessName?.toLowerCase().includes(q) ||
      o.productDetails?.name?.toLowerCase().includes(q)
    );
  });

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar active="orders" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading orders...</p>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const filterTabs = [
    { key: "all", label: "All", count: stats.total },
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
    <div className="flex h-screen bg-[#f8f7f6]">
      <CustomerSidebar active="orders" session={session} />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
          <div className="flex items-center gap-4">
            <button className="relative text-gray-900 hover:text-[#eb9728]">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-semibold">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { label: "Total", value: stats.total || 0 },
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
                color: "text-red-500",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm"
              >
                <p
                  className={`text-xl font-bold ${s.color || "text-gray-900"}`}
                >
                  {s.value}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="border-b border-gray-200 px-4">
              <div className="flex gap-1 overflow-x-auto">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeFilter === tab.key
                        ? "border-[#eb9728] text-[#eb9728]"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          activeFilter === tab.key
                            ? "bg-[#eb9728]/10 text-[#eb9728]"
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
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-3 gap-2">
                <span className="material-symbols-outlined text-gray-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by order ID, manufacturer or product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#eb9728]"
              >
                <option value="all">All Types</option>
                <option value="rfq">RFQ Orders</option>
                <option value="product">Product Orders</option>
                <option value="group_buy">Group Buy</option>
              </select>
            </div>
          </div>

          {/* Orders */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-4 block">
                inventory_2
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No orders found
              </h3>
              <p className="text-gray-500 mb-6">
                {activeFilter === "all"
                  ? "You haven't placed any orders yet."
                  : `No orders with this status.`}
              </p>
              {activeFilter === "all" && (
                <Link
                  href="/custom-orders/new"
                  className="px-6 py-3 bg-[#eb9728] text-white rounded-lg font-semibold hover:bg-[#eb9728]/90 text-sm"
                >
                  Create Custom Order
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <CustomerOrderCard
                  key={order._id}
                  order={order}
                  onRefresh={fetchOrders}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CustomerOrderCard({ order, onRefresh }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error || "Could not cancel order");
    } catch (err) {
      alert("Error cancelling order");
    } finally {
      setCancelling(false);
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-gray-900">
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
              <p className="text-sm text-gray-500">
                {order.manufacturerId?.businessName ||
                  order.manufacturerId?.name ||
                  "Manufacturer"}
              </p>
            </div>
            <span className="text-lg font-bold text-[#eb9728]">
              ${order.totalPrice?.toLocaleString() || "—"}
            </span>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <span className="text-gray-500">Quantity</span>
              <p className="font-medium">{order.quantity} units</p>
            </div>
            <div>
              <span className="text-gray-500">Ordered</span>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Est. Delivery</span>
              <p className="font-medium">
                {order.estimatedDeliveryDate
                  ? new Date(order.estimatedDeliveryDate).toLocaleDateString()
                  : "Pending"}
              </p>
            </div>
            {order.trackingNumber && (
              <div>
                <span className="text-gray-500">Tracking</span>
                <p className="font-medium text-blue-600">
                  {order.trackingNumber}
                </p>
              </div>
            )}
          </div>

          {/* Production progress (visible in production) */}
          {order.status === "in_production" && totalMilestones > 0 && (
            <div className="mb-2">
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
        <div className="flex flex-row sm:flex-col gap-2 sm:min-w-[140px] justify-end">
          <button
            onClick={() => router.push(`/customer/orders/${order._id}`)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800"
          >
            View Details
          </button>
          {order.status === "pending_acceptance" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50"
            >
              {cancelling ? "..." : "Cancel"}
            </button>
          )}
          {order.status === "completed" && !order.reviewed && (
            <button
              onClick={() =>
                router.push(`/customer/orders/${order._id}?review=true`)
              }
              className="px-4 py-2 bg-[#eb9728] text-white text-sm font-semibold rounded-lg hover:bg-[#eb9728]/90"
            >
              Leave Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerSidebar({ active, session }) {
  const navItems = [
    {
      href: "/customer/dashboard",
      icon: "home",
      label: "Dashboard",
      key: "dashboard",
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
          <h1 className="text-2xl font-bold text-gray-900">Craftit</h1>
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
      <div>
        <LogoutButton />
      </div>
    </aside>
  );
}
