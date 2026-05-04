// app/manufacturer/disputes/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_COLORS = {
  open: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  manufacturer_responded: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  under_review: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  closed: "bg-white/5 text-white/40 border border-white/10",
};

const ISSUE_LABELS = {
  item_not_received: "Item not received",
  item_not_as_described: "Not as described",
  quality_issue: "Quality issue",
  wrong_item: "Wrong item",
  damaged_item: "Damaged item",
  late_delivery: "Late delivery",
  refund_not_received: "Refund issue",
  other: "Other",
};

export default function ManufacturerDisputesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchDisputes = useCallback(async () => {
    try {
      const res = await fetch("/api/disputes");
      const data = await res.json();
      if (data.disputes) setDisputes(data.disputes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      fetchDisputes();
    }
  }, [status, session, router, fetchDisputes]);

  const filtered =
    filter === "all" ? disputes : disputes.filter((d) => d.status === filter);
  const openCount = disputes.filter((d) =>
    ["open", "manufacturer_responded", "under_review"].includes(d.status),
  ).length;

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading disputes..." />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
              Resolution Center
            </p>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent inline-block">
                Disputes
              </span>
            </h1>
            {openCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <p className="text-[11px] font-bold text-orange-400 uppercase tracking-widest">
                  {openCount} Case{openCount > 1 ? "s" : ""} Requiring Attention
                </p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl">
            {[
              "all",
              "open",
              "manufacturer_responded",
              "under_review",
              "resolved",
            ].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white/[0.03] rounded-3xl border-2 border-purple-500/30 text-center py-24 px-8">
            <GlobalNoResults text="No disputes found" />
            <p className="text-sm text-white/20 mt-2 max-w-xs mx-auto">
              {filter === "all"
                ? "Excellent! No disputes have been filed on your orders."
                : `You don't have any cases with the status "${filter.replace(/_/g, " ")}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((dispute) => (
              <Link
                key={dispute._id}
                href={`/manufacturer/disputes/${dispute._id}`}
                className="group"
              >
                <div className="bg-white/[0.03] rounded-3xl border-2 border-purple-500/30 p-6 hover:bg-white/[0.07] hover:border-purple-500/50 transition-all relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLORS[dispute.status] || "bg-white/5 text-white/40"}`}
                        >
                          {dispute.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                          Case: {dispute.disputeNumber}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#eb9728] transition-colors">
                        {ISSUE_LABELS[dispute.issueType] || dispute.issueType}
                      </h3>
                      
                      <p className="text-sm text-white/40 line-clamp-1 mb-4">
                        {dispute.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Order</span>
                          <span className="text-sm font-bold text-white/70">{dispute.orderId?.orderNumber}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Customer</span>
                          <span className="text-sm font-bold text-white/70">{dispute.customerId?.name}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Date Filed</span>
                          <span className="text-sm font-bold text-white/70">{new Date(dispute.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-8 shrink-0">
                      <div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Amount</p>
                        <p className="text-2xl font-black text-[#eb9728]">
                          ${dispute.orderId?.totalPrice?.toLocaleString()}
                        </p>
                      </div>
                      {dispute.status === "open" && (
                        <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">
                            Action Needed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Subtle hover indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/0 group-hover:bg-purple-500/50 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
