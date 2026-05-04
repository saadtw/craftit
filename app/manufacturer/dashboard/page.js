// app/manufacturer/dashboard/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import GlobalLoader from "@/components/ui/GlobalLoader";
import Link from "next/link";
import Image from "next/image";
import Lottie from "lottie-react";

// ASSETS
import DashboardIcon from "@/assets/Dashboard.png";
import OrdersIcon from "@/assets/orders.png";
import RFQIcon from "@/assets/RFQ.png";
import BidsIcon from "@/assets/bid.png";
import GroupBuyIcon from "@/assets/groupbuy.png";
import PaymentsIcon from "@/assets/payments.png";
import AnalyticsIcon from "@/assets/ActivityLog.png";
import ProductIcon from "@/assets/products.png";
import ProfileIcon from "@/assets/Profile.png";
import RatingIcon from "@/assets/rating.png";
import RevenueIcon from "@/assets/revenue.png";
import SellerIcon from "@/assets/Seller.png";
import HomeScreenAnimation from "@/assets/HomeScreenAnimation.json";

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending_acceptance: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  in_production: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-500 border border-red-500/20",
  disputed: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
};

const STATUS_LABELS = {
  pending_acceptance: "Pending",
  accepted: "Accepted",
  in_production: "In Production",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

// ─── Circular Stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor = "text-white/40", icon }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group w-32 h-32 sm:w-40 sm:h-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#eb9728] to-purple-600 p-[4px] shadow-lg transition-transform duration-300 group-hover:scale-105">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#0B011D] border-[3px] border-[#0B011D] px-2 text-center overflow-hidden">
            <div className="w-8 h-8 sm:w-10 sm:h-10 mb-1 shrink-0">
              <Image src={icon} alt="" width={40} height={40} className="object-contain" />
            </div>
            <p className="text-[10px] font-bold text-white/40 leading-none tracking-widest mb-1 uppercase line-clamp-1">{label}</p>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">{value}</p>
            {sub && <p className={`text-[9px] sm:text-[10px] mt-1 font-medium ${subColor} line-clamp-1`}>{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Redesigned Quick action card (Horizontal Layout) ─────────────────────────
function ActionCard({ href, icon, label, desc }) {
  return (
    <Link href={href}>
      <div className="bg-white/[0.03] rounded-[20px] border-2 border-purple-500/30 hover:border-purple-500 hover:bg-white/[0.05] p-4 transition-all duration-300 cursor-pointer group shadow-sm">
        <div className="flex items-center gap-4">
          {/* Circular Icon Container */}
          <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-all duration-300">
            <Image src={icon} alt="" width={26} height={26} className="object-contain group-hover:scale-110 transition-transform duration-300" />
          </div>
          {/* Text Content */}
          <div className="flex-grow min-w-0">
            <p className="font-bold text-white text-[15px] group-hover:text-purple-400 transition-colors truncate">
              {label}
            </p>
            <p className="text-[11px] text-white/30 mt-0.5 truncate uppercase tracking-tight font-bold">{desc}</p>
          </div>
          {/* Right Indicator Arrow */}
          <div className="shrink-0 text-white/10 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all duration-300">
             <span className="material-symbols-outlined text-[16px]">arrow_forward_ios</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

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
      router.replace("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "manufacturer") {
        router.replace("/auth/login");
        return;
      }
      fetchDashboardData();
    }
  }, [status, session, router, fetchDashboardData]);

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading your dashboard..." />;
  }

  const displayName = userData?.businessName || session?.user?.name || "Manufacturer";
  const isVerified = userData?.verificationStatus === "verified";
  const completionRate = stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-6 max-w-7xl">
        
        {/* ─── Welcome banner ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0c0c11] px-8 py-8 sm:px-10 sm:py-9 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_40%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_35%)] pointer-events-none" />
          
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-8 items-center">
            {/* LEFT CONTENT */}
            <div>
              <p className="text-white/40 text-sm">Welcome back,</p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#eb9728] via-purple-500 to-indigo-400 bg-clip-text text-transparent">
                  {displayName}
                </h1>
                {isVerified && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                    </span>
                )}
              </div>

              <p className="mt-2 text-sm text-white/40 max-w-xl leading-relaxed">
                {stats.pendingOrders > 0
                  ? `You have ${stats.pendingOrders} pending order${stats.pendingOrders > 1 ? "s" : ""} awaiting acceptance.`
                  : "Your dashboard is up to date."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/manufacturer/products/new"
                  className="group flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm font-bold text-white transition-all hover:bg-gradient-to-r hover:from-[#eb9728] hover:to-purple-600 hover:border-transparent hover:shadow-[0_4px_20px_rgba(235,151,40,0.3)]"
                >
                  <Image src={ProductIcon} alt="" width={30} height={30} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  New Product
                </Link>
                <Link
                  href="/manufacturer/rfqs"
                  className="group flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm font-bold text-white transition-all hover:bg-gradient-to-r hover:from-[#eb9728] hover:to-purple-600 hover:border-transparent hover:shadow-[0_4px_20px_rgba(235,151,40,0.3)]"
                >
                  <Image src={RFQIcon} alt="" width={30} height={30} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  Browse RFQs
                </Link>
              </div>
            </div>

            {/* RIGHT ANIMATION */}
            <div className="hidden lg:flex justify-end items-center">
              <div className="w-[190px] h-[190px]">
                <Lottie
                  animationData={HomeScreenAnimation}
                  loop={true}
                  autoplay={true}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Stats row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <StatCard label="Total Orders" value={stats.totalOrders} icon={OrdersIcon} />
          <StatCard
            label="Pending"
            value={stats.pendingOrders}
            icon={RFQIcon}
          />
          <StatCard label="Completed" value={stats.completedOrders} icon={DashboardIcon} />
          <StatCard
            label="Revenue"
            value={`$${stats.revenue >= 1000 ? (stats.revenue / 1000).toFixed(1) + "k" : stats.revenue.toFixed(0)}`}
            icon={RevenueIcon}
          />
          <StatCard label="Open RFQs" value={stats.activeRfqs} icon={BidsIcon} />
          <StatCard
            label="Rating"
            value={stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} ★` : "—"}
            icon={RatingIcon}
            sub={stats.totalReviews > 0 ? `${stats.totalReviews} reviews` : "No reviews yet"}
          />
        </div>

        {/* ─── Redesigned Quick actions ────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-[11px] font-black text-white/50 uppercase tracking-[0.4em]">Quick Actions</h2>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-[#eb9728]/30 via-white/10 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard href="/manufacturer/rfqs" icon={RFQIcon} label="Browse RFQs" desc="Find opportunities" />
            <ActionCard href="/manufacturer/bids" icon={BidsIcon} label="My Bids" desc="Track your bids" />
            <ActionCard href="/manufacturer/group-buys" icon={GroupBuyIcon} label="Group Buys" desc="Manage campaigns" />
            <ActionCard href="/manufacturer/orders" icon={OrdersIcon} label="Orders" desc="View and fulfil" />
            <ActionCard href="/manufacturer/products/new" icon={ProductIcon} label="Add Product" desc="List new product" />
            <ActionCard href={`/manufacturers/${session?.user?.id}`} icon={SellerIcon} label="My Profile" desc="Public view" />
          </div>
        </div>

        {/* ─── Main grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl shadow-sm overflow-hidden h-full">
              <div className="px-6 py-4 border-b-2 border-purple-500/30 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Recent Orders</h2>
                <Link href="/manufacturer/orders" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-[#eb9728]/10 hover:text-[#eb9728] hover:border-[#eb9728]/30 transition-all duration-300">
                  View all
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-16 h-16 bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Image src={OrdersIcon} alt="" width={32} height={32} className="opacity-20" />
                  </div>
                  <p className="text-sm text-white/20 font-medium">No orders yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-wide">Order</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-wide">Customer</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-wide">Value</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-wide">Delivery</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-mono text-xs font-bold text-white tracking-tighter">#{order.orderNumber}</p>
                            <p className="text-[10px] text-white/40 mt-0.5 max-w-[120px] truncate uppercase">{order.productDetails?.name || "Custom Order"}</p>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-white/60">{order.customerId?.name || "—"}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[order.status] || "bg-white/5 text-white/40"}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-white">${order.totalPrice?.toLocaleString() || "—"}</td>
                          <td className="px-5 py-3.5 text-xs text-white/40">
                            {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : "TBD"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link href={`/manufacturer/orders/${order._id}`} className="text-[#eb9728] hover:text-amber-500">
                              <span className="material-symbols-outlined text-base">east</span>
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

          <div className="space-y-5">
            <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-white mb-4">Performance</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/40">Completion Rate</span>
                    <span className="text-xs font-bold text-white">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#eb9728] via-purple-500 to-indigo-600 transition-all duration-700" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/40">Avg. Rating</span>
                    <span className="text-xs font-bold text-white">{stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} / 5` : "No ratings yet"}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#eb9728] via-purple-500 to-indigo-600 transition-all duration-700" style={{ width: `${(stats.averageRating / 5) * 100}%` }} />
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Total Revenue</span>
                    <span className="text-base font-extrabold text-white">${stats.revenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b-2 border-purple-500/30 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Recent Bids</h2>
                <Link href="/manufacturer/bids" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-[#eb9728]/10 hover:text-[#eb9728] hover:border-[#eb9728]/30 transition-all duration-300">
                  View all
                </Link>
              </div>
              {recentBids.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/20 uppercase font-bold tracking-widest">No bids yet.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentBids.map((bid) => (
                    <Link key={bid._id} href={`/manufacturer/bids/${bid._id}`} className="block px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-[#eb9728] transition-colors uppercase tracking-tight">
                            {bid.rfqId?.title || bid.customOrderId?.title || "RFQ Bid"}
                          </p>
                          <p className="text-[10px] text-white/30 mt-1 font-bold">${bid.bidAmount?.toLocaleString()} · QUOTED</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          bid.status === "accepted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                          bid.status === "rejected" ? "bg-red-500/10 text-red-400 border border-red-500/20" : 
                          "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                          {bid.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {!isVerified && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">verified_user</span>
                  <div>
                    <p className="text-sm font-bold text-amber-500">Get Verified</p>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">
                      Upload your business documents to unlock the Verified badge and build customer trust.
                    </p>
                    <Link
                      href="/manufacturer/settings?tab=verification"
                      className="inline-block mt-3 px-3 py-1.5 bg-[#eb9728] hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
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

      <footer className="border-t border-white/5 py-8 mt-12 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">
            &copy; {new Date().getFullYear()} CRAFTIT GLOBAL · ALL RIGHTS RESERVED
          </p>
        </div>
      </footer>
    </div>
  );
}
