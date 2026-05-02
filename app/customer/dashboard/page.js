// app/customer/dashboard/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_COLORS = {
  pending_acceptance:
    "bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20",
  accepted: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
  in_production: "bg-purple-500/10 text-purple-300 border border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-300 border border-red-500/20",
  disputed: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
};

const STATUS_LABELS = {
  pending_acceptance: "Pending",
  accepted: "Accepted",
  in_production: "In Production",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

function StatCard({ icon, label, value, accent = false }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl p-5 border transition-all hover:scale-[1.03] ${
        accent
          ? "bg-gradient-to-br from-[#eb9728]/15 to-[#eb9728]/5 border-[#eb9728]/40"
          : "bg-[#0c0c11] border-white/8 hover:border-white/15"
      }`}
    >
      {/* Circle Icon */}
      <div
        className={`h-14 w-14 rounded-full flex items-center justify-center border-[3px] transition-all ${
          accent
            ? "border-[#eb9728] bg-[#eb9728]/15 text-[#eb9728] shadow-[0_0_18px_rgba(235,151,40,0.3)]"
            : "border-white/20 bg-white/[0.04] text-white/50 hover:border-white/35"
        }`}
      >
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>

      {/* Value */}
      <p
        className={`text-2xl font-black tabular-nums ${accent ? "text-[#eb9728]" : "text-white"}`}
      >
        {value}
      </p>

      {/* Label */}
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 text-center leading-tight">
        {label}
      </p>
    </div>
  );
}

function ActionCard({ href, icon, label, desc, accent }) {
  return (
    <Link
      href={href}
      className="group rounded-[20px] border border-white/8 bg-[#0c0c11] p-4 hover:border-[#eb9728]/25 hover:bg-[#101017] transition-all"
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
            accent
              ? "bg-[#eb9728]/10 text-[#eb9728] border-[#eb9728]/20"
              : "bg-purple-500/10 text-purple-300 border-purple-500/20"
          }`}
        >
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white group-hover:text-[#eb9728] transition-colors">
            {label}
          </p>
          <p className="text-xs text-white/40 truncate">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    pendingRFQs: 0,
    disputedOrders: 0,
    totalSpend: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentRFQs, setRecentRFQs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [ordersRes, rfqsRes] = await Promise.all([
        fetch("/api/orders?limit=5"),
        fetch("/api/rfqs?limit=3"),
      ]);
      const [ordersData, rfqsData] = await Promise.all([
        ordersRes.json(),
        rfqsRes.json(),
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
          disputedOrders: s.disputed || 0,
          totalSpend: orders
            .filter((o) => o.status === "completed")
            .reduce((sum, o) => sum + (o.totalPrice || 0), 0),
        });
      }

      if (rfqsData.success) setRecentRFQs(rfqsData.rfqs?.slice(0, 3) || []);
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
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading dashboard..." />
        </div>
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
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-7">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0c0c11] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_34%),radial-gradient(circle_at_left,rgba(235,151,40,0.13),transparent_30%)] pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                Customer Dashboard
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
                {greeting}, {firstName}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/55 max-w-2xl leading-7">
                {stats.activeOrders > 0
                  ? `You have ${stats.activeOrders} active order${stats.activeOrders > 1 ? "s" : ""} in progress.`
                  : "Ready to start a new manufacturing project?"}
              </p>
            </div>

            <div className="flex flex-wrap lg:flex-col gap-3 lg:min-w-[220px]">
              <Link
                href="/custom-orders/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#eb9728] px-5 py-3 text-sm font-bold text-white hover:bg-amber-500 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Custom Order
              </Link>
              <Link
                href="/customer/custom-orders"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/75 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                View Custom Orders
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            icon="receipt_long"
            label="Total Orders"
            value={stats.totalOrders}
          />
          <StatCard
            icon="pending_actions"
            label="Active"
            value={stats.activeOrders}
            accent
          />
          <StatCard
            icon="check_circle"
            label="Completed"
            value={stats.completedOrders}
          />
          <StatCard icon="gavel" label="Open RFQs" value={stats.pendingRFQs} />
          <StatCard
            icon="report"
            label="Disputes"
            value={stats.disputedOrders}
          />
          <StatCard
            icon="payments"
            label="Spend"
            value={`$${stats.totalSpend >= 1000 ? (stats.totalSpend / 1000).toFixed(1) + "k" : stats.totalSpend.toFixed(0)}`}
          />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Workspace Shortcuts
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <ActionCard
              href="/custom-orders/new"
              icon="add_circle"
              label="Custom Order"
              desc="Start a manufacturing request"
              accent
            />
            <ActionCard
              href="/customer/orders"
              icon="receipt_long"
              label="My Orders"
              desc="Track statuses and delivery"
            />
            <ActionCard
              href="/customer/wishlist"
              icon="favorite"
              label="Wishlist"
              desc="Saved products and suppliers"
            />
            <ActionCard
              href="/customer/settings"
              icon="settings"
              label="Settings"
              desc="Profile and security"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-6">
          <div className="rounded-[26px] border border-white/8 bg-[#0c0c11] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Recent Orders</h2>
                <p className="text-xs text-white/35 mt-1">
                  Latest manufacturing activity
                </p>
              </div>
              <Link
                href="/customer/orders"
                className="text-xs font-semibold text-[#eb9728] hover:text-amber-400"
              >
                View all →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-white/15 block mb-3">
                  receipt_long
                </span>
                <p className="text-sm text-white/45">No orders yet.</p>
                <Link
                  href="/custom-orders/new"
                  className="inline-block mt-3 text-xs font-semibold text-[#eb9728] hover:text-amber-400"
                >
                  Create your first request →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/6">
                {recentOrders.slice(0, 5).map((order) => (
                  <Link key={order._id} href={`/customer/orders/${order._id}`}>
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors group">
                      <div className="h-11 w-11 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/35">
                          inventory_2
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-[#eb9728]">
                          {order.productDetails?.name ||
                            order.productId?.name ||
                            "Custom Order"}
                        </p>
                        <p className="text-xs text-white/35 mt-1 truncate">
                          {order.orderNumber} ·{" "}
                          {order.manufacturerId?.businessName || "Manufacturer"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            STATUS_COLORS[order.status] ||
                            "bg-white/[0.05] text-white/55 border border-white/8"
                          }`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                        <p className="mt-1 text-xs font-bold text-white/75">
                          ${order.totalPrice?.toLocaleString() || "—"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[26px] border border-white/8 bg-[#0c0c11] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">My RFQs</h2>
                <Link
                  href="/customer/rfqs"
                  className="text-xs font-semibold text-[#eb9728]"
                >
                  View all →
                </Link>
              </div>

              {recentRFQs.length === 0 ? (
                <div className="py-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-white/15 block mb-2">
                    gavel
                  </span>
                  <p className="text-xs text-white/40">No RFQs yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/6">
                  {recentRFQs.map((rfq) => (
                    <Link key={rfq._id} href={`/customer/rfqs/${rfq._id}`}>
                      <div className="px-5 py-4 hover:bg-white/[0.03] group">
                        <p className="text-sm font-bold text-white truncate group-hover:text-[#eb9728]">
                          {rfq.title || "RFQ"}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-white/35">
                            {rfq.bids?.length || 0} bid
                            {(rfq.bids?.length || 0) !== 1 ? "s" : ""} received
                          </p>
                          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                            {rfq.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[26px] border border-white/8 bg-[#0c0c11] p-5">
              <h2 className="text-sm font-bold text-white mb-4">Account</h2>
              <div className="flex items-center gap-3 pb-4 border-b border-white/8">
                <div className="h-11 w-11 rounded-full bg-[#eb9728] flex items-center justify-center text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-white/35 truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1">
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
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/[0.04] hover:text-[#eb9728] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
