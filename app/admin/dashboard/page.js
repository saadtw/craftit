// app/admin/dashboard/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
        return;
      }
      fetchDashboardData();
    }
  }, [status, session]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, logRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/activity-log?limit=10"),
      ]);
      const statsData = await statsRes.json();
      const logData = await logRes.json();
      setStats(statsData.stats || statsData);
      if (Array.isArray(logData.logs)) setActivityLog(logData.logs);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Pending Verifications",
      value: stats?.pendingVerifications ?? 0,
      icon: "🏭",
      href: "/admin/manufacturers",
      accent: "text-amber-400",
      urgent: (stats?.pendingVerifications ?? 0) > 0,
    },
    {
      label: "Active Disputes",
      value: stats?.activeDisputes ?? 0,
      icon: "⚠️",
      href: "/admin/disputes",
      accent: "text-red-400",
      urgent: (stats?.activeDisputes ?? 0) > 0,
    },
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: "👥",
      href: "/admin/users",
      accent: "text-sky-400",
      urgent: false,
    },
    {
      label: "Total Manufacturers",
      value: stats?.totalManufacturers ?? 0,
      icon: "🏭",
      href: "/admin/manufacturers",
      accent: "text-emerald-400",
      urgent: false,
    },
    {
      label: "Active Orders",
      value: stats?.activeOrders ?? 0,
      icon: "📦",
      href: "/admin/orders",
      accent: "text-violet-400",
      urgent: false,
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-50">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back, {session?.user?.name}. Here&apos;s what needs your
          attention.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`bg-slate-900 border rounded-xl p-5 hover:border-slate-600 transition-colors ${
              card.urgent ? "border-amber-800/60" : "border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{card.icon}</span>
              {card.urgent && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className={`text-3xl font-bold ${card.accent}`}>{card.value}</p>
            <p className="text-slate-500 text-xs mt-1 leading-tight">
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Alerts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Critical Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-50 font-semibold text-sm mb-4">
            Critical Alerts
          </h2>
          <div className="space-y-3">
            {(stats?.pendingVerifications ?? 0) > 0 && (
              <Link
                href="/admin/manufacturers"
                className="flex items-center gap-3 p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg hover:border-amber-700/60 transition-colors"
              >
                <span className="text-amber-400 text-lg">🏭</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium">
                    {stats.pendingVerifications} manufacturer
                    {stats.pendingVerifications !== 1 ? "s" : ""} awaiting
                    verification
                  </p>
                  <p className="text-slate-500 text-xs">Requires review</p>
                </div>
                <span className="text-slate-500 text-sm">→</span>
              </Link>
            )}
            {(stats?.activeDisputes ?? 0) > 0 && (
              <Link
                href="/admin/disputes"
                className="flex items-center gap-3 p-3 bg-red-950/40 border border-red-800/40 rounded-lg hover:border-red-700/60 transition-colors"
              >
                <span className="text-red-400 text-lg">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium">
                    {stats.activeDisputes} active dispute
                    {stats.activeDisputes !== 1 ? "s" : ""} open
                  </p>
                  <p className="text-slate-500 text-xs">Needs resolution</p>
                </div>
                <span className="text-slate-500 text-sm">→</span>
              </Link>
            )}
            {(stats?.pendingVerifications ?? 0) === 0 &&
              (stats?.activeDisputes ?? 0) === 0 && (
                <div className="flex items-center gap-3 p-3 bg-emerald-950/30 border border-emerald-800/30 rounded-lg">
                  <span className="text-emerald-400 text-lg">✓</span>
                  <p className="text-slate-400 text-sm">
                    No critical alerts — all clear
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-50 font-semibold text-sm mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/manufacturers"
              className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
            >
              <span className="text-2xl">🏭</span>
              <span className="text-slate-300 text-xs font-medium">
                Verify Manufacturers
              </span>
            </Link>
            <Link
              href="/admin/disputes"
              className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
            >
              <span className="text-2xl">⚠️</span>
              <span className="text-slate-300 text-xs font-medium">
                Resolve Disputes
              </span>
            </Link>
            <Link
              href="/admin/users"
              className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
            >
              <span className="text-2xl">👥</span>
              <span className="text-slate-300 text-xs font-medium">
                Manage Users
              </span>
            </Link>
            <Link
              href="/admin/orders"
              className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-center"
            >
              <span className="text-2xl">📦</span>
              <span className="text-slate-300 text-xs font-medium">
                View Orders
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-slate-50 font-semibold text-sm">
            Recent Admin Activity
          </h2>
          <Link
            href="/admin/activity-log"
            className="text-amber-500 text-xs hover:text-amber-400 transition-colors"
          >
            View all →
          </Link>
        </div>
        {activityLog.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500 text-sm">
            No activity recorded yet
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {activityLog.map((log, idx) => (
              <div
                key={log._id || idx}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-500 text-base">
                    {log.action?.includes("approve")
                      ? "✅"
                      : log.action?.includes("reject")
                        ? "❌"
                        : log.action?.includes("suspend")
                          ? "🔒"
                          : log.action?.includes("dispute")
                            ? "⚖️"
                            : "📝"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-slate-300 text-sm truncate">
                      {log.description || log.action}
                    </p>
                    <p className="text-slate-600 text-xs">
                      {log.adminName || "Admin"}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-slate-600 text-xs">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                  <p className="text-slate-700 text-xs">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
