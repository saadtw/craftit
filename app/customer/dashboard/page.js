"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CustomerSidebar from "@/components/CustomerSidebar";

// ─── Status helpers (mirrors orders page) ────────────────────────────────────
const STATUS_COLORS = {
  pending_acceptance: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  in_production: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  disputed: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS = {
  pending_acceptance: "Pending",
  accepted: "Accepted",
  in_production: "In Production",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

// ─── Mini stat card ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent = false }) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border flex items-center gap-4 ${accent ? "border-[#eb9728]/30" : "border-gray-100"}`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-[#eb9728]/10 text-[#eb9728]" : "bg-gray-100 text-gray-500"}`}
      >
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-2xl font-extrabold mt-0.5 ${accent ? "text-[#eb9728]" : "text-gray-900"}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────
function ActionCard({ href, icon, iconBg, label, desc }) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-[#eb9728]/40 hover:shadow-md transition-all duration-200 cursor-pointer group">
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
          >
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm group-hover:text-[#eb9728] transition-colors">
              {label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    pendingRFQs: 0,
    activeGroupBuys: 0,
    totalSpend: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentRFQs, setRecentRFQs] = useState([]);
  const [activeGroupBuys, setActiveGroupBuys] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [ordersRes, rfqsRes, gbRes] = await Promise.all([
        fetch("/api/orders?limit=5"),
        fetch("/api/rfqs?limit=3"),
        fetch("/api/group-buys/public?limit=3"),
      ]);
      const [ordersData, rfqsData, gbData] = await Promise.all([
        ordersRes.json(),
        rfqsRes.json(),
        gbRes.json(),
      ]);

      if (ordersData.success) {
        const orders = ordersData.orders || [];
        const s = ordersData.stats || {};
        setRecentOrders(orders);
        setStats({
          totalOrders: s.total || 0,
          activeOrders: (s.accepted || 0) + (s.in_production || 0),
          completedOrders: s.completed || 0,
          pendingRFQs: rfqsData.success
            ? (rfqsData.rfqs || []).filter(
                (r) => r.status === "open" || r.status === "bidding",
              ).length
            : 0,
          activeGroupBuys: gbData.success ? gbData.pagination?.total || 0 : 0,
          totalSpend: orders
            .filter((o) => o.status === "completed")
            .reduce((sum, o) => sum + (o.totalPrice || 0), 0),
        });
      }

      if (rfqsData.success) setRecentRFQs(rfqsData.rfqs?.slice(0, 3) || []);
      if (gbData.success)
        setActiveGroupBuys(gbData.groupBuys?.slice(0, 3) || []);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      fetchDashboardData();
    }
  }, [status, session, router, fetchDashboardData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar active="dashboard" session={session} />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      <CustomerSidebar active="dashboard" session={session} />

      <main className="flex-1 overflow-y-auto">
        {/* ── Header ── */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/customer/settings"
              className="relative text-gray-500 hover:text-[#eb9728] transition-colors"
              title="Settings"
            >
              <span className="material-symbols-outlined">settings</span>
            </Link>
            <Link
              href="/customer/settings"
              className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {initials}
            </Link>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* ── Welcome banner ── */}
          <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div>
              <p className="text-gray-400 text-sm">{greeting},</p>
              <h2 className="text-2xl font-extrabold text-white mt-0.5">
                {firstName} 👋
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {stats.activeOrders > 0
                  ? `You have ${stats.activeOrders} active order${stats.activeOrders > 1 ? "s" : ""} in progress.`
                  : "Ready to start a new manufacturing project?"}
              </p>
            </div>
            <Link
              href="/customer/custom-orders/new"
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#eb9728] hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Custom Order
            </Link>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              icon="receipt_long"
              label="Total Orders"
              value={stats.totalOrders}
            />
            <StatCard
              icon="pending_actions"
              label="Active Orders"
              value={stats.activeOrders}
              accent
            />
            <StatCard
              icon="check_circle"
              label="Completed"
              value={stats.completedOrders}
            />
            <StatCard
              icon="gavel"
              label="Open RFQs"
              value={stats.pendingRFQs}
            />
            <StatCard
              icon="group"
              label="Group Buys"
              value={stats.activeGroupBuys}
            />
            <StatCard
              icon="payments"
              label="Total Spend"
              value={`$${stats.totalSpend >= 1000 ? (stats.totalSpend / 1000).toFixed(1) + "k" : stats.totalSpend.toFixed(0)}`}
            />
          </div>

          {/* ── Quick actions ── */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ActionCard
                href="/customer/custom-orders/new"
                icon="add_circle"
                iconBg="bg-amber-100 text-amber-600"
                label="Custom Order"
                desc="Start a manufacturing request"
              />
              <ActionCard
                href="/customer/explore"
                icon="storefront"
                iconBg="bg-green-100 text-green-600"
                label="Explore Products"
                desc="Browse manufacturer listings"
              />
              <ActionCard
                href="/customer/rfqs"
                icon="gavel"
                iconBg="bg-blue-100 text-blue-600"
                label="My RFQs"
                desc="View bids & proposals"
              />
              <ActionCard
                href="/customer/group-buys"
                icon="group"
                iconBg="bg-purple-100 text-purple-600"
                label="Group Buys"
                desc="Unlock tier discounts"
              />
            </div>
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent orders — spans 2 cols */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">
                    Recent Orders
                  </h2>
                  <Link
                    href="/customer/orders"
                    className="text-xs font-semibold text-[#eb9728] hover:underline"
                  >
                    View all →
                  </Link>
                </div>
                {recentOrders.length === 0 ? (
                  <div className="py-14 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">
                      receipt_long
                    </span>
                    <p className="text-sm text-gray-400">No orders yet.</p>
                    <Link
                      href="/customer/explore"
                      className="inline-block mt-3 text-xs font-semibold text-[#eb9728] hover:underline"
                    >
                      Browse products →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recentOrders.slice(0, 5).map((order) => (
                      <Link
                        key={order._id}
                        href={`/customer/orders/${order._id}`}
                      >
                        <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-gray-400 text-lg">
                              inventory_2
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-[#eb9728] transition-colors">
                              {order.productDetails?.name ||
                                order.productId?.name ||
                                "Custom Order"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {order.orderNumber} ·{" "}
                              {order.manufacturerId?.businessName ||
                                "Manufacturer"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}
                            >
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                            <span className="text-xs font-bold text-gray-700">
                              ${order.totalPrice?.toLocaleString() || "—"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Active RFQs */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900">My RFQs</h2>
                  <Link
                    href="/customer/rfqs"
                    className="text-xs font-semibold text-[#eb9728] hover:underline"
                  >
                    View all →
                  </Link>
                </div>
                {recentRFQs.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-gray-200 block mb-1">
                      gavel
                    </span>
                    <p className="text-xs text-gray-400">No RFQs yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recentRFQs.map((rfq) => (
                      <Link key={rfq._id} href={`/customer/rfqs/${rfq._id}`}>
                        <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#eb9728] transition-colors">
                              {rfq.title || "RFQ"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {rfq.bids?.length || 0} bid
                              {(rfq.bids?.length || 0) !== 1 ? "s" : ""}{" "}
                              received
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rfq.status === "open" || rfq.status === "bidding"
                                ? "bg-green-100 text-green-700"
                                : rfq.status === "awarded"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {rfq.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Group Buys */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900">
                    Active Group Buys
                  </h2>
                  <Link
                    href="/customer/group-buys"
                    className="text-xs font-semibold text-[#eb9728] hover:underline"
                  >
                    View all →
                  </Link>
                </div>
                {activeGroupBuys.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-gray-200 block mb-1">
                      group
                    </span>
                    <p className="text-xs text-gray-400">
                      No active group buys.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {activeGroupBuys.map((gb) => {
                      const maxQty =
                        gb.tiers?.[gb.tiers.length - 1]?.minQuantity || 1;
                      const pct = Math.min(
                        ((gb.currentQuantity || 0) / maxQty) * 100,
                        100,
                      );
                      return (
                        <Link
                          key={gb._id}
                          href={`/customer/group-buys/${gb._id}`}
                        >
                          <div className="px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#eb9728] transition-colors pr-2">
                                {gb.title}
                              </p>
                              <span className="text-xs font-bold text-[#eb9728] shrink-0">
                                $
                                {(
                                  gb.currentDiscountedPrice ?? gb.basePrice
                                )?.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-600 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {gb.currentParticipantCount || 0} joined
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Account summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">
                  Account
                </h2>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-11 h-11 rounded-full bg-[#eb9728] flex items-center justify-center text-white font-bold text-base shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    {
                      href: "/customer/settings",
                      icon: "manage_accounts",
                      label: "Edit Profile",
                    },
                    {
                      href: "/customer/settings?tab=security",
                      icon: "lock",
                      label: "Change Password",
                    },
                    {
                      href: "/customer/orders",
                      icon: "receipt_long",
                      label: "Order History",
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-[#eb9728]/10 hover:text-[#eb9728] transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
