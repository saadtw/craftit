// app/admin/disputes/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES = {
  open: "bg-red-900/40 text-red-400 border-red-800/40",
  under_review: "bg-yellow-900/40 text-yellow-400 border-yellow-800/40",
  resolved: "bg-emerald-900/40 text-emerald-400 border-emerald-800/40",
};

export default function AdminDisputesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchDisputes = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter !== "all") params.set("status", statusFilter);
      try {
        const res = await fetch(`/api/admin/disputes?${params}`);
        const data = await res.json();
        if (data.success) {
          setDisputes(data.disputes || []);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
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
      fetchDisputes();
    }
  }, [status, session, router, fetchDisputes]);

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
        <h1 className="text-2xl font-bold text-slate-50">Dispute Resolution</h1>
        <p className="text-slate-500 text-sm mt-1">
          Review and resolve customer disputes
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {[
          { key: "open", label: "Open" },
          { key: "under_review", label: "Under Review" },
          { key: "resolved", label: "Resolved" },
          { key: "all", label: "All" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-amber-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-slate-500 text-sm">{pagination.total} disputes</p>
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Loading disputes...
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No {statusFilter !== "all" ? statusFilter : ""} disputes found
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {disputes.map((dispute) => (
              <div
                key={dispute._id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="shrink-0">
                    <p className="text-slate-400 text-xs font-mono">
                      {dispute.disputeNumber}
                    </p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      {new Date(dispute.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">
                      {dispute.issueType?.replace(/_/g, " ") ||
                        "General Dispute"}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Order:{" "}
                      <span className="font-mono">
                        {dispute.orderId?.orderNumber || "—"}
                      </span>
                    </p>
                    <p className="text-slate-600 text-xs">
                      {dispute.customerId?.name || "Customer"} vs{" "}
                      {dispute.manufacturerId?.businessName ||
                        dispute.manufacturerId?.name ||
                        "Manufacturer"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_STYLES[dispute.status] || "bg-slate-800 text-slate-400 border-slate-700"}`}
                  >
                    {dispute.status?.replace(/_/g, " ")}
                  </span>
                  <Link
                    href={`/admin/disputes/${dispute._id}`}
                    className="text-amber-500 hover:text-amber-400 text-sm transition-colors"
                  >
                    Review →
                  </Link>
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
                onClick={() => fetchDisputes(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => fetchDisputes(pagination.page + 1)}
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
