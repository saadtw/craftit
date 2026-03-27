"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function AdminUserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Suspend modal state
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("terms_violation");
  const [suspendDetail, setSuspendDetail] = useState("");
  const [suspendDuration, setSuspendDuration] = useState("30");

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
      fetchUser();
    }
  }, [status, session, id]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setOrders(data.orders || data.recentOrders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendDetail.trim()) {
      alert("Please provide a reason for suspension.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suspend",
          reason: suspendReason,
          detail: suspendDetail,
          duration: suspendDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSuspendModal(false);
        await fetchUser();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unsuspend" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUser();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-slate-400">User not found.</p>
        <Link
          href="/admin/users"
          className="text-amber-500 text-sm mt-2 inline-block"
        >
          ← Back to Users
        </Link>
      </div>
    );
  }

  const isSuspended = user.isActive === false;

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/users"
        className="text-slate-500 hover:text-slate-300 text-sm transition-colors mb-6 inline-block"
      >
        ← Back to Users
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{user.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded text-xs font-semibold border ${
              isSuspended
                ? "bg-red-900/40 text-red-400 border-red-800/40"
                : "bg-emerald-900/40 text-emerald-400 border-emerald-800/40"
            }`}
          >
            {isSuspended ? "Suspended" : "Active"}
          </span>
          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Account Information
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ["Full Name", user.name],
              ["Email", user.email],
              ["Phone", user.phone || "—"],
              ["Role", user.role],
              ["Status", isSuspended ? "Suspended" : "Active"],
              [
                "Joined",
                new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              ],
              [
                "Last Active",
                user.lastActive
                  ? new Date(user.lastActive).toLocaleDateString()
                  : "—",
              ],
              [
                "Location",
                [user.city, user.country].filter(Boolean).join(", ") || "—",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-slate-600 text-xs mb-0.5">{label}</p>
                <p className="text-slate-200">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Statistics
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-slate-50">
                {orders.length}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {user.role === "customer" ? "Total Orders" : "Orders Received"}
              </p>
            </div>
            {user.role === "manufacturer" && (
              <>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-slate-50">
                    {user.stats?.totalReviews ?? 0}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">Reviews</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {user.stats?.averageRating?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">Avg. Rating</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Suspension Info */}
        {isSuspended && user.suspensionReason && (
          <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-6">
            <h2 className="text-red-400 font-semibold text-sm mb-2">
              Suspension Details
            </h2>
            <p className="text-red-300 text-sm capitalize">
              {user.suspensionReason?.replace(/_/g, " ")}
            </p>
            {user.suspensionDetail && (
              <p className="text-red-300 text-sm mt-1">
                {user.suspensionDetail}
              </p>
            )}
          </div>
        )}

        {/* Recent Orders */}
        {orders.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
              Recent Orders
            </h2>
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                >
                  <div>
                    <p className="text-slate-200 text-sm font-medium">
                      {order.orderNumber}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded capitalize">
                      {order.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!isSuspended ? (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="px-5 py-2.5 bg-red-800 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Suspend Account
            </button>
          ) : (
            <button
              onClick={handleUnsuspend}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Unsuspend Account
            </button>
          )}
        </div>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-slate-50 font-semibold text-lg mb-4">
              Suspend Account
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1.5">
                  Reason
                </label>
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                >
                  <option value="terms_violation">Terms Violation</option>
                  <option value="multiple_complaints">
                    Multiple Complaints
                  </option>
                  <option value="fraudulent_activity">
                    Fraudulent Activity
                  </option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-sm block mb-1.5">
                  Details (required)
                </label>
                <textarea
                  value={suspendDetail}
                  onChange={(e) => setSuspendDetail(e.target.value)}
                  rows={3}
                  placeholder="Explain the reason for suspension..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm block mb-1.5">
                  Duration
                </label>
                <select
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {actionLoading ? "Suspending..." : "Confirm Suspension"}
              </button>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
