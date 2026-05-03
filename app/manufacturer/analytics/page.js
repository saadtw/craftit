// app/manufacturer/analytics/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

// ASSETS
import OrdersIcon from "@/assets/orders.png";
import RevenueIcon from "@/assets/revenue.png";
import BidsIcon from "@/assets/bid.png";
import RatingIcon from "@/assets/rating.png";
import DashboardIcon from "@/assets/Dashboard.png";

// ─── Square Stat card with Gradient Border ─────────────────────────────────────
function StatCard({ label, value, sub, subColor = "text-white/40", icon }) {
  return (
    <div className="w-full">
      <div className="relative group h-32 sm:h-36">
        {/* Outer Square Ring (Thick Border effect) */}
        <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-[#eb9728] to-purple-600 p-[3px] shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-[21px] bg-[#0B011D] border-[2px] border-[#0B011D] px-3 text-center overflow-hidden">
            <div className="w-8 h-8 mb-1 shrink-0">
              <Image src={icon} alt="" width={40} height={40} className="object-contain" />
            </div>
            <p className="text-[10px] font-bold text-white/40 leading-none tracking-widest mb-1.5 uppercase line-clamp-1">{label}</p>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">{value}</p>
            {sub && <p className={`text-[10px] mt-1.5 font-bold ${subColor} line-clamp-1`}>{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManufacturerAnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [ordersRes, bidsRes, productsRes, reviewsRes] = await Promise.all([
        fetch("/api/orders?limit=200"),
        fetch("/api/bids?limit=200"),
        fetch("/api/products?limit=100"),
        fetch(`/api/reviews?manufacturerId=${session?.user?.id}`),
      ]);
      const [ordersData, bidsData, productsData, reviewsData] =
        await Promise.all([
          ordersRes.json(),
          bidsRes.json(),
          productsRes.json(),
          reviewsRes.json(),
        ]);

      const orders = ordersData.orders || [];
      const bids = bidsData.bids || [];
      const products = productsData.products || [];
      const reviews = reviewsData.reviews || [];

      // Order analytics
      const byStatus = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});
      const totalRevenue = orders
        .filter((o) => o.status === "completed")
        .reduce((s, o) => s + (o.totalPrice || 0), 0);
      const avgOrderValue =
        orders.length > 0
          ? totalRevenue /
            Math.max(orders.filter((o) => o.status === "completed").length, 1)
          : 0;

      // Bid analytics
      const acceptedBids = bids.filter((b) => b.status === "accepted").length;
      const bidAcceptanceRate =
        bids.length > 0 ? Math.round((acceptedBids / bids.length) * 100) : 0;

      // Monthly revenue for last 6 months
      const now = new Date();
      const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = d.toLocaleDateString("en-US", { month: "short" });
        const rev = orders
          .filter((o) => {
            const od = new Date(o.createdAt);
            return (
              o.status === "completed" &&
              od.getMonth() === d.getMonth() &&
              od.getFullYear() === d.getFullYear()
            );
          })
          .reduce((s, o) => s + (o.totalPrice || 0), 0);
        return { label, value: rev };
      });

      // Review breakdown
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length
          : 0;
      const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => Math.round(r.overallRating) === star)
          .length,
      }));

      setData({
        orders,
        bids,
        products,
        reviews,
        byStatus,
        totalRevenue,
        avgOrderValue,
        acceptedBids,
        bidAcceptanceRate,
        monthlyRevenue,
        avgRating,
        ratingDist,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

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
      fetchAnalytics();
    }
  }, [status, session, router, fetchAnalytics]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#eb9728] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const maxMonthly = Math.max(...data.monthlyRevenue.map((m) => m.value), 1);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#eb9728] via-purple-500 via-indigo-500 to-emerald-400 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Performance overview across orders, bids, and products
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Orders" value={data.orders.length} icon={OrdersIcon} />
            <StatCard label="Total Revenue" value={`$${data.totalRevenue.toLocaleString()}`} icon={RevenueIcon} />
            <StatCard label="Bid Win Rate" value={`${data.bidAcceptanceRate}%`} icon={BidsIcon} />
            <StatCard 
                label="Avg. Rating" 
                value={data.avgRating > 0 ? `${data.avgRating.toFixed(1)} ★` : "—"} 
                icon={RatingIcon} 
                sub={data.reviews.length > 0 ? `${data.reviews.length} reviews` : "No reviews yet"}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue bar chart */}
          <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-bold text-white mb-4">
              Revenue — Last 6 Months
            </h2>
            <div className="flex items-end gap-2 h-36">
              {data.monthlyRevenue.map((m) => (
                <div
                  key={m.label}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-[10px] text-white/30 font-medium group-hover:text-[#eb9728] transition-colors">
                    {m.value > 0
                      ? `$${m.value >= 1000 ? (m.value / 1000).toFixed(1) + "k" : m.value}`
                      : ""}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-b from-[#eb9728] via-purple-500 to-indigo-600 transition-all duration-500 group-hover:from-[#eb9728] group-hover:to-purple-400"
                    style={{
                      height: `${Math.max((m.value / maxMonthly) * 100, m.value > 0 ? 8 : 2)}%`,
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[10px] text-white/40">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order status breakdown */}
          <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-bold text-white mb-4">
              Orders by Status
            </h2>
            <div className="space-y-2.5">
              {Object.entries({
                completed: { label: "Completed", color: "from-emerald-400 to-emerald-600" },
                in_production: {
                  label: "In Production",
                  color: "from-purple-400 to-purple-600",
                },
                accepted: { label: "Accepted", color: "from-blue-400 to-blue-600" },
                pending_acceptance: {
                  label: "Pending",
                  color: "from-amber-400 to-amber-600",
                },
                cancelled: { label: "Cancelled", color: "from-red-400 to-red-600" },
                disputed: { label: "Disputed", color: "from-orange-400 to-orange-600" },
              }).map(([key, meta]) => {
                const count = data.byStatus[key] || 0;
                const pct =
                  data.orders.length > 0
                    ? Math.round((count / data.orders.length) * 100)
                    : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60 font-medium">
                        {meta.label}
                      </span>
                      <span className="text-white/40">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${meta.color} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bid stats */}
          <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-bold text-white mb-4">
              Bid Performance
            </h2>
            <div className="space-y-3">
              {[
                { label: "Total bids placed", value: data.bids.length },
                { label: "Bids accepted", value: data.acceptedBids },
                {
                  label: "Bids pending",
                  value: data.bids.filter((b) => b.status === "pending").length,
                },
                {
                  label: "Bids rejected",
                  value: data.bids.filter((b) => b.status === "rejected")
                    .length,
                },
                {
                  label: "Bids withdrawn",
                  value: data.bids.filter((b) => b.status === "withdrawn")
                    .length,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                >
                  <span className="text-sm text-white/50">{row.label}</span>
                  <span className="text-sm font-bold text-white">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating distribution */}
          <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-bold text-white mb-1">
              Customer Ratings
            </h2>
            <p className="text-xs text-white/40 mb-4">
              {data.reviews.length} total reviews
            </p>
            {data.reviews.length === 0 ? (
              <div className="text-center py-8 text-white/20">
                <span className="material-symbols-outlined text-3xl block mb-1">
                  star_border
                </span>
                <p className="text-sm">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.ratingDist.map(({ star, count }) => {
                  const pct =
                    data.reviews.length > 0
                      ? Math.round((count / data.reviews.length) * 100)
                      : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-white/50 w-6 text-right">
                        {star}★
                      </span>
                      <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-[#eb9728] h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-6">{count}</span>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-white/5 text-center">
                  <span className="text-2xl font-extrabold text-amber-500">
                    {data.avgRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-white/40 ml-1">/ 5.0</span>
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
