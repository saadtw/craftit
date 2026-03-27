"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ManufacturerNav from "@/components/Manufacturernav";

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
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const maxMonthly = Math.max(...data.monthlyRevenue.map((m) => m.value), 1);

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <ManufacturerNav session={session} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-blue-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Performance overview across orders, bids, and products
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Orders",
              value: data.orders.length,
              icon: "receipt_long",
              bg: "bg-blue-100 text-blue-600",
            },
            {
              label: "Total Revenue",
              value: `$${data.totalRevenue.toLocaleString()}`,
              icon: "payments",
              bg: "bg-emerald-100 text-emerald-600",
            },
            {
              label: "Bid Win Rate",
              value: `${data.bidAcceptanceRate}%`,
              icon: "gavel",
              bg: "bg-orange-100 text-orange-500",
            },
            {
              label: "Avg. Rating",
              value:
                data.avgRating > 0 ? `${data.avgRating.toFixed(1)} ★` : "—",
              icon: "star",
              bg: "bg-amber-100 text-amber-500",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}
              >
                <span className="material-symbols-outlined text-xl">
                  {kpi.icon}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{kpi.label}</p>
                <p className="text-xl font-extrabold text-blue-900">
                  {kpi.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-blue-900 mb-4">
              Revenue — Last 6 Months
            </h2>
            <div className="flex items-end gap-2 h-36">
              {data.monthlyRevenue.map((m) => (
                <div
                  key={m.label}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-gray-400 font-medium">
                    {m.value > 0
                      ? `$${m.value >= 1000 ? (m.value / 1000).toFixed(1) + "k" : m.value}`
                      : ""}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-blue-500 transition-all"
                    style={{
                      height: `${Math.max((m.value / maxMonthly) * 100, m.value > 0 ? 8 : 2)}%`,
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[10px] text-gray-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-blue-900 mb-4">
              Orders by Status
            </h2>
            <div className="space-y-2.5">
              {Object.entries({
                completed: { label: "Completed", color: "bg-green-500" },
                in_production: {
                  label: "In Production",
                  color: "bg-purple-500",
                },
                accepted: { label: "Accepted", color: "bg-blue-500" },
                pending_acceptance: {
                  label: "Pending",
                  color: "bg-yellow-500",
                },
                cancelled: { label: "Cancelled", color: "bg-red-400" },
                disputed: { label: "Disputed", color: "bg-orange-500" },
              }).map(([key, meta]) => {
                const count = data.byStatus[key] || 0;
                const pct =
                  data.orders.length > 0
                    ? Math.round((count / data.orders.length) * 100)
                    : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">
                        {meta.label}
                      </span>
                      <span className="text-gray-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${meta.color} h-2 rounded-full transition-all`}
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-blue-900 mb-4">
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
                  className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className="text-sm font-bold text-blue-900">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-blue-900 mb-1">
              Customer Ratings
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {data.reviews.length} total reviews
            </p>
            {data.reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
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
                      <span className="text-xs text-gray-500 w-6 text-right">
                        {star}★
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-amber-400 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-6">{count}</span>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-gray-50 text-center">
                  <span className="text-2xl font-extrabold text-amber-500">
                    {data.avgRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">/ 5.0</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
