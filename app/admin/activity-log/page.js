// app/admin/activity-log/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const ACTION_ICONS = {
  approve_manufacturer: "✅",
  reject_manufacturer: "❌",
  request_info: "📋",
  suspend_user: "🔒",
  unsuspend_user: "🔓",
  resolve_dispute: "⚖️",
  view_order: "👁",
};

export default function AdminActivityLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 25 });
      if (actionFilter !== "all") params.set("action", actionFilter);
      try {
        const res = await fetch(`/api/admin/activity-log?${params}`);
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setLogs(data.logs || []);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [actionFilter],
  );

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
      fetchLogs();
    }
  }, [status, session, router, fetchLogs]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-50">Activity Log</h1>
        <p className="text-slate-500 text-sm mt-1">
          Complete audit trail of all admin actions
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        >
          <option value="all">All Actions</option>
          <option value="approve_manufacturer">Manufacturer Approvals</option>
          <option value="reject_manufacturer">Manufacturer Rejections</option>
          <option value="suspend_user">User Suspensions</option>
          <option value="resolve_dispute">Dispute Resolutions</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            {pagination.total} total actions
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Loading activity log...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No admin activity recorded yet
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {logs.map((log, idx) => (
              <div
                key={log._id || idx}
                className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="shrink-0 w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-base mt-0.5">
                  {ACTION_ICONS[log.action] || "📝"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm">
                    {log.description || log.action?.replace(/_/g, " ")}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-600 text-xs">
                      by {log.adminName || "Admin"}
                    </p>
                    {log.targetType && (
                      <>
                        <span className="text-slate-700">·</span>
                        <p className="text-slate-600 text-xs capitalize">
                          {log.targetType?.replace(/_/g, " ")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-slate-500 text-xs">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                  <p className="text-slate-700 text-xs mt-0.5">
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

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-slate-500 text-sm">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
