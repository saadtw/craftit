// app/admin/manufacturers/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiCheckCircle, FiXCircle, FiClock, FiShield } from "react-icons/fi";

const STATUS_STYLES = {
  unverified: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    dot: "bg-amber-500"
  },
  verified: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500"
  },
  suspended: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    dot: "bg-red-500"
  }
};

export default function AdminManufacturersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unverified");

  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/manufacturers?status=${filter}`);
      const data = await res.json();
      if (data.success) setManufacturers(data.manufacturers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
      fetchManufacturers();
    }
  }, [status, session, router, fetchManufacturers]);

  const handleVerify = async (id, action, reason = "") => {
    try {
      const res = await fetch(`/api/admin/manufacturers/${id}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason:
            action === "reject"
              ? reason || "Does not meet requirements"
              : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchManufacturers();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const tabs = [
    { key: "unverified", label: "Pending" },
    { key: "verified", label: "Verified" },
    { key: "suspended", label: "Suspended" },
  ];

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-8 relative z-10">
      {/* Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#020617]/0 to-[#020617]/0" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text tracking-tighter uppercase leading-none mb-2">
              Manufacturer Verification
            </h1>
            <p className="text-white/40 text-sm font-medium">
              Review and approve manufacturer applications
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-4 border-b border-white/5 pb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`relative px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                filter === tab.key
                  ? "text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  : "text-slate-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/5"
              }`}
            >
              {filter === tab.key && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 -z-10" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex justify-center">
             <GlobalLoader text="Loading manufacturers..." />
          </div>
        ) : manufacturers.length === 0 ? (
          <GlobalNoResults text={`No ${filter} manufacturers found`} />
        ) : (
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="divide-y divide-white/5">
              {manufacturers.map((m) => {
                const statusStyle = STATUS_STYLES[m.verificationStatus || "unverified"] || STATUS_STYLES.unverified;
                
                return (
                  <div key={m._id} className="p-6 sm:p-8 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} animate-pulse`} />
                              {m.verificationStatus?.toUpperCase()}
                           </span>
                           <h3 className="text-white font-black text-xl tracking-tight">
                              {m.businessName}
                           </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                           <div>
                              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Contact</p>
                              <p className="text-slate-300 text-sm font-medium">{m.contactPerson || m.name}</p>
                           </div>
                           <div>
                              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Email</p>
                              <p className="text-slate-300 text-sm font-medium truncate">{m.businessEmail || m.email}</p>
                           </div>
                           <div>
                              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Location</p>
                              <p className="text-slate-300 text-sm font-medium">
                                {[m.businessAddress?.city, m.businessAddress?.country].filter(Boolean).join(", ") || "—"}
                              </p>
                           </div>
                           <div>
                              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Joined</p>
                              <p className="text-slate-300 text-sm font-medium">
                                {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                           </div>
                        </div>

                        {/* Capabilities preview */}
                        {m.manufacturingCapabilities?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {m.manufacturingCapabilities.slice(0, 4).map((cap) => (
                              <span key={cap} className="px-2 py-1 bg-white/[0.03] text-white/50 border border-white/5 text-[10px] uppercase font-bold tracking-wider rounded-lg">
                                {cap.replace(/_/g, " ")}
                              </span>
                            ))}
                            {m.manufacturingCapabilities.length > 4 && (
                              <span className="px-2 py-1 bg-white/[0.03] text-white/30 border border-white/5 text-[10px] font-bold rounded-lg">
                                +{m.manufacturingCapabilities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        {m.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-xs font-medium"><span className="font-bold">Rejection reason:</span> {m.rejectionReason}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex flex-col items-end gap-3">
                        <Link
                          href={`/admin/manufacturers/${m._id}`}
                          className="inline-flex items-center justify-center px-6 py-3 bg-white/[0.02] border border-white/5 hover:border-transparent hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 text-slate-300 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          Review Application
                        </Link>
                        
                        {m.verificationStatus === "unverified" && (
                           <div className="flex flex-col gap-2 w-full">
                             <button
                               onClick={() => handleVerify(String(m._id), "approve")}
                               className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                             >
                               <FiCheckCircle className="w-4 h-4 shrink-0" /> Approve
                             </button>
                             <button
                               onClick={() => {
                                 const reason = prompt("Rejection reason (optional):");
                                 if (reason !== null) handleVerify(String(m._id), "reject", reason);
                               }}
                               className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                             >
                               <FiXCircle className="w-4 h-4 shrink-0" /> Reject
                             </button>
                             <button
                               onClick={() => {
                                 const info = prompt("What additional information is needed?");
                                 if (info) handleVerify(String(m._id), "request_info", info);
                               }}
                               className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                             >
                               <FiClock className="w-4 h-4 shrink-0" /> Request Info
                             </button>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
