"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

// ─── Status helpers ───────────────────────────────────────────────────────────
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

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  subColor = "text-gray-400",
  icon,
  iconBg,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-extrabold text-blue-900 mt-0.5">{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────
function ActionCard({ href, icon, iconBg, label, desc }) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl border-2 border-gray-100 hover:border-orange-400 hover:shadow-md p-5 transition-all duration-200 cursor-pointer group h-full">
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
          >
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm group-hover:text-orange-500 transition-colors">
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
export default function ManufacturerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    activeRfqs: 0,
    completedOrders: 0,
    averageRating: 0,
    totalReviews: 0,
    pendingOrders: 0,
    activeGroupBuys: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [meRes, ordersRes, rfqsRes, bidsRes, gbRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/orders?limit=5"),
        fetch("/api/rfqs?status=open&limit=1"),
        fetch("/api/bids?limit=4"),
        fetch("/api/group-buys?status=active&limit=1"),
      ]);

      const [meData, ordersData, rfqsData, bidsData, gbData] =
        await Promise.all([
          meRes.json(),
          ordersRes.json(),
          rfqsRes.json(),
          bidsRes.json(),
          gbRes.json(),
        ]);

      if (meData.success) {
        setUserData(meData.user);
        const s = meData.user.stats || {};
        setStats((prev) => ({
          ...prev,
          totalOrders: s.totalOrders || 0,
          revenue: s.totalRevenue || 0,
          completedOrders: s.completedOrders || 0,
          averageRating: s.averageRating || 0,
          totalReviews: s.totalReviews || 0,
        }));
      }

      if (ordersData.success) {
        const orders = ordersData.orders || [];
        setRecentOrders(orders);
        const s = ordersData.stats || {};
        setStats((prev) => ({
          ...prev,
          pendingOrders: s.pending_acceptance || 0,
        }));
      }

      if (rfqsData.success) {
        setStats((prev) => ({
          ...prev,
          activeRfqs: rfqsData.pagination?.total || rfqsData.rfqs?.length || 0,
        }));
      }

      if (bidsData.success) {
        setRecentBids(bidsData.bids?.slice(0, 4) || []);
      }

      if (gbData.success) {
        setStats((prev) => ({
          ...prev,
          activeGroupBuys:
            gbData.pagination?.total || gbData.groupBuys?.length || 0,
        }));
      }
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
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchDashboardData();
    }
  }, [status, session, router, fetchDashboardData]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const displayName =
    userData?.businessName || session?.user?.name || "Manufacturer";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isVerified = userData?.verificationStatus === "verified";
  const completionRate =
    stats.totalOrders > 0
      ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
      : 0;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-7xl">
        {/* ─── Welcome banner ──────────────────────────────────────────── */}
        <div className="bg-linear-to-br from-blue-900 to-blue-800 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
          <div>
            <p className="text-blue-300 text-sm">{greeting},</p>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-2xl font-extrabold text-white">
                {displayName}
              </h1>
              {isVerified ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full text-xs font-semibold">
                  <svg
                    className="w-3 h-3"
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
                </span>
              ) : (
                <Link
                  href="/manufacturer/settings?tab=verification"
                  className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">
                    warning
                  </span>
                  Unverified
                </Link>
              )}
            </div>
            <p className="text-blue-300 text-sm mt-1">
              {stats.pendingOrders > 0
                ? `You have ${stats.pendingOrders} pending order${stats.pendingOrders > 1 ? "s" : ""} awaiting acceptance.`
                : "Your dashboard is up to date."}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/manufacturer/products/new"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Product
            </Link>
            <Link
              href="/manufacturer/rfqs"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors border border-white/20"
            >
              Browse RFQs
            </Link>
          </div>
        </div>

        {/* ─── Stats row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total Orders"
            value={stats.totalOrders}
            icon="receipt_long"
            iconBg="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Pending"
            value={stats.pendingOrders}
            icon="pending_actions"
            iconBg="bg-yellow-100 text-yellow-600"
            sub={stats.pendingOrders > 0 ? "Needs action" : "All clear"}
            subColor={
              stats.pendingOrders > 0 ? "text-yellow-500" : "text-green-500"
            }
          />
          <StatCard
            label="Completed"
            value={stats.completedOrders}
            icon="check_circle"
            iconBg="bg-green-100 text-green-600"
          />
          <StatCard
            label="Revenue"
            value={`$${stats.revenue >= 1000 ? (stats.revenue / 1000).toFixed(1) + "k" : stats.revenue.toFixed(0)}`}
            icon="payments"
            iconBg="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            label="Open RFQs"
            value={stats.activeRfqs}
            icon="gavel"
            iconBg="bg-orange-100 text-orange-500"
          />
          <StatCard
            label="Rating"
            value={
              stats.averageRating > 0
                ? `${stats.averageRating.toFixed(1)} ★`
                : "—"
            }
            icon="star"
            iconBg="bg-amber-100 text-amber-500"
            sub={
              stats.totalReviews > 0
                ? `${stats.totalReviews} reviews`
                : "No reviews yet"
            }
          />
        </div>

        {/* ─── Quick actions ────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ActionCard
              href="/manufacturer/rfqs"
              icon="gavel"
              iconBg="bg-orange-100 text-orange-500"
              label="Browse RFQs"
              desc="Find opportunities"
            />
            <ActionCard
              href="/manufacturer/bids"
              icon="handshake"
              iconBg="bg-blue-100 text-blue-600"
              label="My Bids"
              desc="Track your bids"
            />
            <ActionCard
              href="/manufacturer/group-buys"
              icon="group"
              iconBg="bg-emerald-100 text-emerald-600"
              label="Group Buys"
              desc="Manage campaigns"
            />
            <ActionCard
              href="/manufacturer/orders"
              icon="receipt_long"
              iconBg="bg-purple-100 text-purple-600"
              label="Orders"
              desc="View and fulfil"
            />
            <ActionCard
              href="/manufacturer/products/new"
              icon="add_box"
              iconBg="bg-amber-100 text-amber-600"
              label="Add Product"
              desc="List new product"
            />
            <ActionCard
              href={`/manufacturers/${session?.user?.id}`}
              icon="storefront"
              iconBg="bg-gray-100 text-gray-600"
              label="My Profile"
              desc="Public view"
            />
          </div>
        </div>

        {/* ─── Main grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent orders — 2 cols */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-blue-900">
                  Recent Orders
                </h2>
                <Link
                  href="/manufacturer/orders"
                  className="text-xs font-semibold text-orange-500 hover:underline"
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
                    href="/manufacturer/rfqs"
                    className="inline-block mt-3 text-xs font-semibold text-orange-500 hover:underline"
                  >
                    Browse RFQs →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Order
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Customer
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Value
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Delivery
                        </th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentOrders.map((order) => (
                        <tr
                          key={order._id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-mono text-xs font-bold text-blue-900">
                              {order.orderNumber}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 max-w-[120px] truncate">
                              {order.productDetails?.name || "Custom Order"}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-600">
                            {order.customerId?.name || "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-500"}`}
                            >
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-blue-900">
                            ${order.totalPrice?.toLocaleString() || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-400">
                            {order.estimatedDeliveryDate
                              ? new Date(
                                  order.estimatedDeliveryDate,
                                ).toLocaleDateString()
                              : "TBD"}
                          </td>
                          <td className="px-5 py-3.5">
                            <Link
                              href={`/manufacturer/orders/${order._id}`}
                              className="text-orange-500 hover:text-orange-600"
                            >
                              <span className="material-symbols-outlined text-base">
                                arrow_forward
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Performance summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-blue-900 mb-4">
                Performance
              </h2>
              <div className="space-y-4">
                {/* Completion rate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">
                      Completion Rate
                    </span>
                    <span className="text-xs font-bold text-blue-900">
                      {completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-700 transition-all duration-700"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
                {/* Rating */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">Avg. Rating</span>
                    <span className="text-xs font-bold text-blue-900">
                      {stats.averageRating > 0
                        ? `${stats.averageRating.toFixed(1)} / 5`
                        : "No ratings yet"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500 transition-all duration-700"
                      style={{ width: `${(stats.averageRating / 5) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Revenue */}
                <div className="pt-2 border-t border-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total Revenue</span>
                    <span className="text-base font-extrabold text-blue-900">
                      ${stats.revenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent bids */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-blue-900">Recent Bids</h2>
                <Link
                  href="/manufacturer/bids"
                  className="text-xs font-semibold text-orange-500 hover:underline"
                >
                  View all →
                </Link>
              </div>
              {recentBids.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-gray-200 block mb-1">
                    handshake
                  </span>
                  <p className="text-xs text-gray-400">No bids yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentBids.map((bid) => (
                    <Link key={bid._id} href={`/manufacturer/bids/${bid._id}`}>
                      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-orange-500 transition-colors">
                            {bid.rfqId?.title ||
                              bid.customOrderId?.title ||
                              "RFQ Bid"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            ${bid.bidAmount?.toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bid.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : bid.status === "rejected"
                                ? "bg-red-100 text-red-600"
                                : bid.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {bid.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Profile completeness */}
            {!isVerified && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <p className="text-sm font-bold text-amber-800">
                      Get Verified
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Upload your business documents to unlock the Verified
                      badge and build customer trust.
                    </p>
                    <Link
                      href="/manufacturer/settings?tab=verification"
                      className="inline-block mt-2.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Upload Documents →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white/50 py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Craftit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
