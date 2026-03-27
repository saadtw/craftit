"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_COLORS = {
  pending_acceptance: "bg-yellow-900/40 text-yellow-400 border-yellow-800/40",
  accepted: "bg-sky-900/40 text-sky-400 border-sky-800/40",
  in_production: "bg-violet-900/40 text-violet-400 border-violet-800/40",
  shipped: "bg-blue-900/40 text-blue-400 border-blue-800/40",
  completed: "bg-emerald-900/40 text-emerald-400 border-emerald-800/40",
  cancelled: "bg-slate-800 text-slate-500 border-slate-700",
  disputed: "bg-red-900/40 text-red-400 border-red-800/40",
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-50">Order Oversight</h1>
        <p className="text-slate-500 text-sm mt-1">
          Monitor all platform orders
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
          className="bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-4 py-2 text-sm w-64 focus:border-amber-600 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending_acceptance">Pending Acceptance</option>
          <option value="accepted">Accepted</option>
          <option value="in_production">In Production</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="disputed">Disputed</option>
        </select>
        <button
          onClick={() => fetchOrders(1)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-slate-500 text-sm">
            {pagination.total} orders total
          </p>
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No orders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-slate-200 text-sm font-mono">
                        {order.orderNumber}
                      </p>
                      {order.hasDispute && (
                        <span className="text-red-400 text-xs">⚠ Disputed</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 text-sm">
                        {order.customerId?.name || "—"}
                      </p>
                      <p className="text-slate-600 text-xs">
                        {order.customerId?.email || ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 text-sm">
                        {order.manufacturerId?.businessName ||
                          order.manufacturerId?.name ||
                          "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[order.status] || "bg-slate-800 text-slate-400 border-slate-700"}`}
                      >
                        {order.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 text-sm">
                        ${order.totalPrice?.toLocaleString() || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-400 text-sm">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="text-amber-500 hover:text-amber-400 text-sm transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-slate-500 text-sm">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchOrders(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => fetchOrders(pagination.page + 1)}
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
