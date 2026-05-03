// app/manufacturer/orders/[id]/milestones/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const MILESTONE_STATUS_COLORS = {
  pending: "bg-white/5 border-white/10 text-white/40",
  in_progress: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
};

export default function MilestonesManagementPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    dueDate: "",
  });
  const [addError, setAddError] = useState("");

  // Per-milestone update state
  const [updateNotes, setUpdateNotes] = useState({});

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.order);
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
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchOrder();
    }
  }, [status, session, router, fetchOrder]);

  const addMilestone = async () => {
    setAddError("");
    if (!newMilestone.name.trim()) {
      setAddError("Milestone name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMilestone),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => ({ ...prev, milestones: data.milestones }));
        setNewMilestone({ name: "", description: "", dueDate: "" });
        setShowAddForm(false);
      } else {
        setAddError(data.error || "Failed to add milestone");
      }
    } catch (err) {
      setAddError("Error adding milestone");
    } finally {
      setSaving(false);
    }
  };

  const updateMilestone = async (milestoneId, newStatus) => {
    const notes = updateNotes[milestoneId] || "";
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, status: newStatus, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => ({
          ...prev,
          milestones: data.milestones,
          status: data.orderStatus || prev.status,
        }));
        setUpdateNotes((prev) => ({ ...prev, [milestoneId]: "" }));
      } else {
        alert(data.error || "Failed to update");
      }
    } catch (err) {
      alert("Error updating milestone");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading milestones..." />;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Order not found.</p>
      </div>
    );
  }

  const completedCount =
    order.milestones?.filter((m) => m.status === "completed").length || 0;
  const total = order.milestones?.length || 0;
  const progressPercent =
    total > 0 ? Math.round((completedCount / total) * 100) : 0;


  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header section with back button */}
      <header className="sticky top-0 z-50 bg-[#050507]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link
              href={`/manufacturer/orders/${id}`}
              className="group flex items-center gap-4 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.3)] group-hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] group-hover:scale-105 transition-all duration-300">
                <span className="material-symbols-outlined text-white text-[16px] font-bold group-hover:-translate-x-0.5 transition-transform">
                  arrow_back
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                BACK TO ORDER
              </span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <h1 className="text-xl font-black tracking-tighter uppercase font-mono">
              <span
                style={{ 
                  background: 'linear-gradient(to right, #9333ea, #f97316, #fbbf24, #ffffff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline-block'
                }}
              >
                {order.orderNumber}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">ROADMAP MANAGEMENT</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-3">
            Production Roadmap
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-purple-500/30" />
            Tracking production stages for {order.productDetails?.name || order.orderNumber}
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] p-8 backdrop-blur-md mb-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 blur-[120px] bg-purple-500/5 group-hover:bg-purple-500/10 transition-all duration-700" />
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Overall Progress</p>
              <p className="text-4xl font-black text-white tracking-tighter">
                {progressPercent}<span className="text-lg text-white/40">%</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Completion Status</p>
              <p className="text-2xl font-black text-emerald-500 tracking-tighter">
                {completedCount} <span className="text-sm text-white/40">/ {total}</span>
              </p>
            </div>
          </div>
          
          <div className="w-full bg-white/5 border border-white/5 rounded-full h-2 relative z-10 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 via-orange-500 to-gold-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(147,51,234,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Order Status Note */}
        <div
          className={`mb-8 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${
            order.status === "completed"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : order.status === "in_production"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_20px_rgba(147,51,234,0.1)]"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>
              Order Status: <span className="text-white ml-2">{order.status.replace(/_/g, " ")}</span>
              {order.status === "accepted" && (
                <span className="text-white/40 italic ml-4 lowercase tracking-normal font-medium">
                  — Start a milestone to move to production.
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-4 mb-12">
          {order.milestones?.length === 0 && (
            <div className="bg-white/[0.03] border border-purple-500/20 border-dashed rounded-[2.5rem] p-16 text-center">
              <span className="material-symbols-outlined text-5xl text-white/10 mb-4">route</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-relaxed max-w-[250px] mx-auto">
                No roadmap defined yet. Add milestones to track production stages.
              </p>
            </div>
          )}

          {order.milestones?.map((m, i) => (
            <div
              key={m._id || i}
              className={`bg-white/[0.03] rounded-[2rem] border transition-all duration-300 group overflow-hidden ${
                m.status === "completed"
                  ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                  : m.status === "in_progress"
                    ? "border-purple-500/30 bg-purple-500/[0.02] shadow-[0_0_30px_rgba(147,51,234,0.05)]"
                    : "border-white/5"
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-6">
                  {/* Step number / check */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                      m.status === "completed"
                        ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        : m.status === "in_progress"
                          ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                          : "bg-white/5 text-white/20 border border-white/10"
                    }`}
                  >
                    {m.status === "completed" ? (
                      <span className="material-symbols-outlined">check</span>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-black tracking-tight text-white">{m.name}</h3>
                      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${MILESTONE_STATUS_COLORS[m.status]}`}>
                        {m.status.replace("_", " ")}
                      </span>
                    </div>
                    
                    {m.description && (
                      <p className="text-sm text-white/40 leading-relaxed mb-4 normal-case font-medium">
                        {m.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-widest mb-4">
                      {m.dueDate && (
                        <span className="flex items-center gap-1.5 text-white/20">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          DUE: {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {m.completedAt && (
                        <span className="flex items-center gap-1.5 text-emerald-500/60">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          COMPLETED: {new Date(m.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {m.notes && (
                      <div className="flex items-start gap-3 p-4 bg-black/20 rounded-2xl border border-white/5 mb-4 group-hover:bg-black/30 transition-all">
                        <span className="material-symbols-outlined text-[18px] text-purple-500/40">rate_review</span>
                        <p className="text-xs text-white/60 leading-relaxed font-medium">
                          {m.notes}
                        </p>
                      </div>
                    )}

                    {/* Update Controls */}
                    {["accepted", "in_production"].includes(order.status) && m.status !== "completed" && (
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                        <textarea
                          value={updateNotes[m._id] || ""}
                          onChange={(e) => setUpdateNotes((prev) => ({ ...prev, [m._id]: e.target.value }))}
                          placeholder="Add progress notes (visible to customer)..."
                          rows={2}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.04] transition-all resize-none font-medium"
                        />
                        <div className="flex gap-3">
                          {m.status === "pending" && (
                            <button
                              onClick={() => updateMilestone(m._id, "in_progress")}
                              disabled={saving}
                              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                            >
                              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                              Start Stage
                            </button>
                          )}
                          {m.status === "in_progress" && (
                            <button
                              onClick={() => updateMilestone(m._id, "completed")}
                              disabled={saving}
                              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Milestone Form */}
        {["accepted", "in_production"].includes(order.status) && (
          <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] bg-purple-500/5 group-hover:bg-purple-500/10 transition-all duration-700" />
            
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-10 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-white/20 hover:border-purple-500/30 hover:text-purple-400 hover:bg-white/[0.02] transition-all duration-300"
              >
                <span className="material-symbols-outlined text-4xl">add_circle</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Integrate New Stage</span>
              </button>
            ) : (
              <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3">
                    <span className="w-8 h-[2px] bg-purple-500/30" />
                    New Roadmap Stage
                  </h3>
                </div>
                
                {addError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-400">
                    {addError}
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Stage Name *</label>
                    <input
                      type="text"
                      value={newMilestone.name}
                      onChange={(e) => setNewMilestone((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Precision CNC Machining"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.04] transition-all font-medium"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Detailed Specification</label>
                    <textarea
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      placeholder="Explain the technical details or requirements for this stage..."
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.04] transition-all font-medium resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Target Completion Date (optional)</label>
                    <input
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone((p) => ({ ...p, dueDate: e.target.value }))}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.04] transition-all font-medium"
                    />
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={addMilestone}
                      disabled={saving}
                      className="flex-1 py-4 bg-purple-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                      {saving ? "Processing..." : "Commit Milestone"}
                    </button>
                    <button
                      onClick={() => { setShowAddForm(false); setAddError(""); }}
                      className="flex-1 py-4 bg-white/5 text-white/40 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
