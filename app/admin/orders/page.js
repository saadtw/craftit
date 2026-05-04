// app/admin/orders/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FiSearch, FiAlertTriangle } from "react-icons/fi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_STYLES = {
  pending_acceptance: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", dot: "bg-yellow-400" },
  accepted: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20", dot: "bg-sky-400" },
  in_production: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", dot: "bg-violet-400" },
  shipped: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  cancelled: { bg: "bg-white/[0.03]", text: "text-white/40", border: "border-white/5", dot: "bg-white/20" },
  disputed: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400" },
};

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/admin/orders?${params}`);
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter],
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
      fetchOrders();
    }
  }, [status, session, router, fetchOrders]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-8 relative z-10">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#020617]/0 to-[#020617]/0" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text tracking-tighter uppercase leading-none mb-2">
              Order Oversight
            </h1>
            <p className="text-white/40 text-sm font-medium">Monitor all platform orders</p>
          </div>
          <p className="text-white/30 text-sm font-medium bg-white/[0.02] border border-white/5 px-4 py-2 rounded-xl">
            {pagination.total} orders total
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pb-6 border-b border-white/5">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search by order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
              className="bg-white/[0.03] border border-white/5 text-white placeholder-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm w-64 focus:border-purple-500/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="relative inline-block">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px] bg-white/[0.03] border-white/5 text-white/60 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 focus:ring-0 transition-colors cursor-pointer">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                <SelectItem value="all" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">All Statuses</SelectItem>
                <SelectItem value="pending_acceptance" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Pending Acceptance</SelectItem>
                <SelectItem value="accepted" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Accepted</SelectItem>
                <SelectItem value="in_production" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">In Production</SelectItem>
                <SelectItem value="shipped" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Shipped</SelectItem>
                <SelectItem value="completed" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Completed</SelectItem>
                <SelectItem value="cancelled" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Cancelled</SelectItem>
                <SelectItem value="disputed" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={() => fetchOrders(1)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            Search
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <GlobalLoader text="Loading orders..." />
          </div>
        ) : orders.length === 0 ? (
          <GlobalNoResults text="No orders found" />
        ) : (
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">Order</th>
                    <th className="px-3 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">Customer</th>
                    <th className="px-3 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">Manufacturer</th>
                    <th className="px-2 py-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest w-[80px]">Status</th>
                    <th className="px-2 py-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest w-[80px]">Value</th>
                    <th className="px-3 py-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest w-[100px]">Date</th>
                    <th className="px-3 py-4 text-right text-[10px] font-black text-white/30 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((order) => {
                    const s = STATUS_STYLES[order.status] || STATUS_STYLES.cancelled;
                    return (
                      <tr key={order._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-4 whitespace-nowrap">
                          <p className="text-white font-black text-xs font-mono tracking-tighter">{order.orderNumber}</p>
                          {order.hasDispute && (
                            <span className="inline-flex items-center gap-1 text-red-400 text-[8px] font-bold mt-0.5">
                              <FiAlertTriangle className="w-2.5 h-2.5" /> Disputed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-white font-medium text-xs truncate max-w-[140px]">{order.customerId?.name || "—"}</p>
                          <p className="text-white/30 text-[10px] truncate max-w-[140px]">{order.customerId?.email || ""}</p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-white font-medium text-xs truncate max-w-[140px]">{order.manufacturerId?.businessName || order.manufacturerId?.name || "—"}</p>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tight border ${s.bg} ${s.border} ${s.text}`}>
                            <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                            {order.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <p className="text-white font-black text-xs">${order.totalPrice?.toLocaleString() || "—"}</p>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center">
                          <p className="text-white/40 text-[10px] font-medium tracking-tighter">
                            {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-white/[0.02] border border-white/5 hover:border-transparent hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 text-white/50 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-5 border-t border-white/5">
                <p className="text-white/30 text-sm">Page {pagination.page} of {pagination.pages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchOrders(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-4 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] disabled:opacity-30 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => fetchOrders(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-4 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] disabled:opacity-30 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

