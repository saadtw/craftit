// app/admin/manufacturers/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiShield } from "react-icons/fi";
import Image from "next/image";
import documentIcon from "@/assets/document.png";

const STATUS_STYLES = {
  unverified: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", dot: "bg-amber-500" },
  verified: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  suspended: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20", dot: "bg-red-500" }
};

export default function AdminManufacturerDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [checklist, setChecklist] = useState({
    legitimacy: false,
    documents: false,
    contact: false,
  });

  const fetchManufacturer = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/manufacturers/${id}/verify`);
      const data = await res.json();
      if (data.success) setManufacturer(data.manufacturer);
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
      fetchManufacturer();
    }
  }, [status, session, router, fetchManufacturer]);

  const handleAction = async (action) => {
    let reason = "";
    if (action === "reject") {
      reason = prompt("Rejection reason (required):");
      if (!reason) return;
    }
    if (action === "request_info") {
      reason = prompt("What additional information is needed?");
      if (!reason) return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/manufacturers/${id}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchManufacturer();
        alert(data.message);
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
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617]">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <FiAlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-white text-xl font-black mb-4 tracking-tight">Manufacturer not found.</p>
        <Link href="/admin/manufacturers" className="text-purple-500 hover:text-purple-400 font-bold text-sm">
          Return to Manufacturers List
        </Link>
      </div>
    );
  }

  const isPending = manufacturer.verificationStatus === "unverified";
  const statusStyle = STATUS_STYLES[manufacturer.verificationStatus || "unverified"] || STATUS_STYLES.unverified;

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-8 relative z-10">
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-[#020617]/0 to-[#020617]/0" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/admin/manufacturers"
          className="group inline-flex items-center gap-3 text-slate-400 hover:text-white text-[11px] font-black tracking-[0.25em] uppercase transition-colors mb-2"
        >
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all">
            <FiArrowLeft className="w-3 h-3 text-[#020617] stroke-[3]" />
          </span>
          Back To Manufacturers
        </Link>

        {/* Header */}
        <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[28px] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_40%)] pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-purple-500 text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <FiShield className="w-4 h-4" />
                Manufacturer Profile
              </p>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {manufacturer.businessName}
              </h1>
            </div>
            <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot} animate-pulse`} />
              <span className="text-[11px] font-black uppercase tracking-widest">{manufacturer.verificationStatus?.toUpperCase()}</span>
            </div>
          </div>
        </div>

          {/* Business Info */}
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
          <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Business Information
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {[
              ["Contact Person", manufacturer.contactPerson || manufacturer.name],
              ["Email", manufacturer.businessEmail || manufacturer.email],
              ["Phone", manufacturer.businessPhone || manufacturer.phone || "—"],
              ["Reg. Number", manufacturer.businessRegistrationNumber || "—"],
              ["City", manufacturer.businessAddress?.city || "—"],
              ["Country", manufacturer.businessAddress?.country || "—"],
              ["Joined", new Date(manufacturer.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
                <p className="text-white font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>

          {manufacturer.businessDescription && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Description</p>
              <p className="text-white/80 text-sm leading-relaxed">{manufacturer.businessDescription}</p>
            </div>
          )}
        </div>

        {/* Capabilities & Materials */}
        {(manufacturer.manufacturingCapabilities?.length > 0 ||
          manufacturer.materialsAvailable?.length > 0) && (
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
            <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Capabilities & Materials
            </h2>
            {manufacturer.manufacturingCapabilities?.length > 0 && (
              <div className="mb-6">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Manufacturing Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {manufacturer.manufacturingCapabilities.map((cap) => (
                    <span key={cap} className="px-3 py-1.5 bg-white/[0.03] text-white/70 border border-white/5 text-[10px] font-bold uppercase tracking-wider rounded-xl">
                      {cap.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {manufacturer.materialsAvailable?.length > 0 && (
              <div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Materials Available</p>
                <div className="flex flex-wrap gap-2">
                  {manufacturer.materialsAvailable.map((mat) => (
                    <span key={mat} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider rounded-xl">
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
          <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Submitted Documents
          </h2>
          {manufacturer.verificationDocuments?.documents?.length > 0 ? (
            <div className="space-y-3">
              {manufacturer.verificationDocuments.documents.map((doc, idx) => (
                <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all rounded-xl group"
                >
                  <span className="text-white/70 text-sm font-medium flex items-center gap-3">
                    <Image src={documentIcon} alt="Document" className="w-5 h-5 object-contain opacity-70" />
                    <span className="capitalize">{doc.type?.replace(/_/g, " ") || "Document"}</span>
                  </span>
                  <span className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">View</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-sm font-medium text-center py-6">No documents submitted</p>
          )}
        </div>

        {/* Review Checklist (only for pending) */}
        {isPending && (
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[24px] p-6 sm:p-8 shadow-2xl">
            <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
              Internal Review Checklist
            </h2>
            <div className="space-y-3">
              {[
                { key: "legitimacy", label: "Business legitimacy verified" },
                { key: "documents", label: "Documents appear authentic" },
                { key: "contact", label: "Contact information verified" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) =>
                      setChecklist({
                        ...checklist,
                        [item.key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-600 focus:ring-amber-600"
                  />
                  <span className="text-slate-300 text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Rejection reason display */}
        {manufacturer.rejectionReason && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-[24px] p-6">
            <h2 className="text-red-500 text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-3">
              <FiAlertCircle className="w-4 h-4" />
              Rejection Reason
            </h2>
            <p className="text-white/80 text-sm">{manufacturer.rejectionReason}</p>
          </div>
        )}

        {/* Verification form */}
        {isPending && (
          <div className="bg-[#0c0c11] border border-white/10 rounded-[32px] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.05),transparent_60%)] pointer-events-none" />
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <FiShield className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Review Application</h2>
                <p className="text-white/40 text-sm mt-2">Complete the checklist before taking action.</p>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  { key: "legitimacy", label: "Business legitimacy verified" },
                  { key: "documents", label: "Documents appear authentic" },
                  { key: "contact", label: "Contact information verified" },
                ].map((item) => (
                  <label key={item.key} className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                    checklist[item.key] ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/[0.02] border-white/5 hover:border-white/10"
                  }`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      checklist[item.key] ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                    }`}>
                      {checklist[item.key] && <FiCheckCircle className="w-3 h-3 text-[#0c0c11] stroke-[3]" />}
                    </div>
                    <input type="checkbox" checked={checklist[item.key]}
                      onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                      className="sr-only"
                    />
                    <span className={`text-sm font-bold ${checklist[item.key] ? "text-emerald-500" : "text-white/70"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-8">
                <button onClick={() => handleAction("approve")} disabled={actionLoading}
                  className="py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-[11px] uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2">
                  <FiCheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => handleAction("reject")} disabled={actionLoading}
                  className="py-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-black text-[11px] uppercase tracking-wider hover:bg-red-500 hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  <FiXCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => handleAction("request_info")} disabled={actionLoading}
                  className="py-4 rounded-2xl bg-white/[0.02] text-white border border-white/10 font-black text-[11px] uppercase tracking-wider hover:bg-white/[0.05] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  <FiClock className="w-4 h-4" /> Request Info
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
