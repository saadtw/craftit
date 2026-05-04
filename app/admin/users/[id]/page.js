// app/admin/users/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiActivity, 
  FiShield, FiClock, FiCheckCircle, FiAlertCircle, FiArrowLeft,
  FiShoppingBag, FiStar, FiLock, FiUnlock, FiLayers, FiCpu
} from "react-icons/fi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const fetchUser = useCallback(async () => {
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
  }, [id]);

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
  }, [status, session, router, fetchUser]);

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
    return <GlobalLoader fullScreen text="Accessing user profile..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8">
        <FiAlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-white/60 text-lg font-bold">User profile not found.</p>
        <Link
          href="/admin/users"
          className="text-purple-500 font-black uppercase tracking-widest text-xs mt-6 hover:text-purple-400 transition-colors"
        >
          &larr; Back to Directory
        </Link>
      </div>
    );
  }

  const isSuspended = user.isActive === false;

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden selection:bg-purple-500/30 pb-20">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[140px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-8">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex flex-col gap-10">
            <Link
              href="/admin/users"
              className="flex items-center gap-4 group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:scale-110 transition-all">
                <FiArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors pt-0.5">
                Back to Directory
              </span>
            </Link>

            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="relative shrink-0">
                <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-tr from-purple-600 to-indigo-500 p-px shadow-[0_0_40px_rgba(168,85,247,0.3)] overflow-hidden">
                  <div className="w-full h-full rounded-[2.5rem] bg-[#020617] flex items-center justify-center text-4xl font-black text-white overflow-hidden">
                    {user.image || user.profileImage ? (
                      <Image
                        src={user.image || user.profileImage}
                        alt={user.name || ""}
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.name?.charAt(0)
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-6">
                  <h1 className="text-5xl font-black text-white tracking-tighter leading-none">{user.name}</h1>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-black text-purple-400 uppercase tracking-widest">
                      {user.role}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${
                      isSuspended ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    }`}>
                      {isSuspended ? "Suspended" : "Active"}
                    </span>
                  </div>
                </div>
                <p className="text-white/40 text-sm font-medium tracking-wide pl-1">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {!isSuspended ? (
              <button
                onClick={() => setShowSuspendModal(true)}
                className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-red-600 hover:border-transparent text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl flex items-center gap-2 group"
              >
                <FiLock className="w-3 h-3 group-hover:scale-110 transition-transform" />
                Suspend Account
              </button>
            ) : (
              <button
                onClick={handleUnsuspend}
                disabled={actionLoading}
                className="px-8 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-90 flex items-center gap-2 group"
              >
                <FiUnlock className="w-3 h-3 group-hover:scale-110 transition-transform" />
                {actionLoading ? "Processing..." : "Unsuspend Account"}
              </button>
            )}
          </div>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* STATS ROW (FULL WIDTH TOP) */}
          <div className={`${user.role === 'manufacturer' ? 'md:col-span-3' : 'md:col-span-6'} bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 backdrop-blur-md flex flex-col justify-between group hover:bg-purple-500/5 hover:border-purple-500/20 transition-all duration-300`}>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
              <FiShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Total Orders</p>
              <p className="text-3xl font-black text-white tracking-tight">{orders.length}</p>
            </div>
          </div>

          {user.role === "manufacturer" && (
            <>
              <div className="md:col-span-3 bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 backdrop-blur-md flex flex-col justify-between group hover:bg-purple-500/5 hover:border-purple-500/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                  <FiStar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Avg Rating</p>
                  <p className="text-3xl font-black text-white tracking-tight">{user.stats?.averageRating?.toFixed(1) ?? "—"}</p>
                </div>
              </div>

              <div className="md:col-span-3 bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 backdrop-blur-md flex flex-col justify-between group hover:bg-purple-500/5 hover:border-purple-500/20 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                  <FiActivity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Total Reviews</p>
                  <p className="text-3xl font-black text-white tracking-tight">{user.stats?.totalReviews ?? 0}</p>
                </div>
              </div>
            </>
          )}

          <div className={`${user.role === 'manufacturer' ? 'md:col-span-3' : 'md:col-span-6'} bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 backdrop-blur-md flex flex-col justify-between group hover:bg-purple-500/5 hover:border-purple-500/20 transition-all duration-300`}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
              <FiCalendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Joined Date</p>
              <p className="text-xl font-black text-white tracking-tight">{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="md:col-span-8 space-y-6">
            {/* Identity Card */}
            <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
              <h2 className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />
                Identity & Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: "Phone Number", value: user.phone || "Not Provided", icon: <FiPhone />, color: "purple" },
                  { label: "Location", value: [user.city, user.country].filter(Boolean).join(", ") || "Unknown", icon: <FiMapPin />, color: "indigo" },
                  { label: "Last Active", value: user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "Never", icon: <FiClock />, color: "amber" },
                  { label: "System ID", value: user._id, icon: <FiLayers />, color: "sky" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-5 group/item">
                    <div className={`w-14 h-14 rounded-2xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center text-${item.color}-400 group-hover/item:scale-110 group-hover/item:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1 leading-none">{item.label}</p>
                      <p className="text-white font-bold text-[15px] tracking-tight">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Transaction Ledger */}
            <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
              <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                  <FiShoppingBag className="text-purple-500" />
                  Transaction History
                </h2>
                <Link href={`/admin/orders?search=${user.email}`} className="text-[9px] font-black uppercase tracking-widest text-purple-500 hover:text-purple-400 transition-colors">
                  View All Records &rarr;
                </Link>
              </div>
              <div className="divide-y divide-white/5">
                {orders.length > 0 ? (
                  orders.slice(0, 5).map((order) => (
                    <div key={order._id} className="px-8 py-4 hover:bg-purple-500/5 transition-all duration-300 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/10 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 group-hover:text-purple-500 transition-all duration-500">
                          TXN
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold tracking-tight leading-none mb-1.5">{order.orderNumber}</p>
                          <p className="text-white/20 text-[9px] font-black uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-white/40 border border-white/10 group-hover:border-purple-500/30 group-hover:text-white transition-all">
                        {order.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                    No Transaction Data Available
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR AREA */}
          <div className="md:col-span-4 space-y-6">
            {/* Status / Suspension Card */}
            {isSuspended ? (
              <section className="bg-red-500/5 border border-red-500/20 rounded-[2rem] p-6 backdrop-blur-md">
                <h2 className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 mb-6">
                  <FiAlertCircle className="animate-pulse" />
                  Access Restriction
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">Violation Category</p>
                    <p className="text-white font-bold text-sm capitalize">{user.suspensionReason?.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">System Note</p>
                    <p className="text-white/60 text-xs leading-relaxed">{user.suspensionDetail || "No details provided."}</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 backdrop-blur-md flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
                    Account Security
                  </h2>
                  <p className="text-white/40 text-[11px] leading-relaxed">
                    Account is in good standing with active status.
                  </p>
                </div>
              </section>
            )}

            {/* System Metadata Card */}
            <section className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 backdrop-blur-md">
              <h2 className="text-white/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 mb-6">
                <FiCpu className="w-3.5 h-3.5" />
                System Registry
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">Global Database ID</p>
                  <p className="text-white/40 font-mono text-[9px] break-all">{user._id}</p>
                </div>
                <div>
                  <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mb-1">Role Permissions</p>
                  <p className="text-white font-bold text-sm capitalize">{user.role}</p>
                </div>
              </div>
            </section>

            {/* Activity Log Callout */}
            <Link href={`/admin/activity-log?search=${user.name}`} className="block">
              <section className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20 rounded-[2rem] p-6 backdrop-blur-md group hover:from-purple-600/30 hover:to-indigo-600/30 hover:border-purple-500/40 transition-all cursor-pointer">
                <h3 className="text-white font-black text-sm uppercase tracking-tighter mb-2">Audit Logs</h3>
                <p className="text-white/40 text-[10px] leading-relaxed mb-4">
                  Review administrative action history.
                </p>
                <div className="flex items-center gap-2 text-purple-400 text-[9px] font-black uppercase tracking-widest">
                  View Timeline <FiArrowLeft className="rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </section>
            </Link>
          </div>
        </div>
      </div>

      {/* MODERN SUSPEND MODAL */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#020617] border border-white/10 rounded-[3rem] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
            <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter flex items-center gap-3">
              <FiLock className="text-red-500" />
              Restrict Access
            </h3>

            <div className="space-y-4">
                <label className="text-white/20 text-[10px] font-black uppercase tracking-widest ml-1 mb-1 block">
                  Suspension Reason
                </label>
                <Select value={suspendReason} onValueChange={setSuspendReason}>
                  <SelectTrigger className="w-full h-14 bg-white/[0.05] border border-white/10 text-white rounded-xl px-4 text-sm focus:ring-0 focus:border-purple-500/50 transition-all cursor-pointer">
                    <SelectValue placeholder="Select Reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                    <SelectItem value="terms_violation" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors py-2.5">Terms Violation</SelectItem>
                    <SelectItem value="multiple_complaints" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors py-2.5">Multiple Complaints</SelectItem>
                    <SelectItem value="fraudulent_activity" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors py-2.5">Fraudulent Activity</SelectItem>
                    <SelectItem value="other" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors py-2.5">Other</SelectItem>
                  </SelectContent>
                </Select>

              <div>
                <label className="text-white/20 text-[10px] font-black uppercase tracking-widest ml-1 mb-1 block">
                  Detailed Explanation
                </label>
                <textarea
                  value={suspendDetail}
                  onChange={(e) => setSuspendDetail(e.target.value)}
                  rows={3}
                  placeholder="Reason for suspension..."
                  className="w-full bg-white/[0.05] border border-white/10 text-white placeholder:text-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-500/5 transition-all resize-none"
                />
              </div>

                <label className="text-white/20 text-[10px] font-black uppercase tracking-widest ml-1 mb-1 block">
                  Suspension Duration
                </label>
                <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                  <SelectTrigger className="w-full h-14 bg-white/[0.05] border border-white/10 text-white rounded-xl px-4 text-sm focus:ring-0 focus:border-purple-500/50 transition-all cursor-pointer">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                    <SelectItem value="7" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors py-2.5">7 Days</SelectItem>
                    <SelectItem value="30" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors py-2.5">30 Days</SelectItem>
                    <SelectItem value="permanent" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors py-2.5">Permanent</SelectItem>
                  </SelectContent>
                </Select>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="flex-[2] py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                {actionLoading ? "Processing..." : "Enforce Suspension"}
              </button>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// LEGACY CODE PRESERVATION
// ---------------------------------------------------------

/*
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const fetchUser = useCallback(async () => {
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
  }, [id]);

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
  }, [status, session, router, fetchUser]);

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
        <GlobalLoader text="Loading..." />
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
    </div>
  );
}
*/
