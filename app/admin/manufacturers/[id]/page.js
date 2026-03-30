// app/admin/manufacturers/[id]/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
  }, [status, session, id]);

  const fetchManufacturer = async () => {
    try {
      const res = await fetch(`/api/admin/manufacturers/${id}/verify`);
      const data = await res.json();
      if (data.success) setManufacturer(data.manufacturer);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Manufacturer not found.</p>
        <Link
          href="/admin/manufacturers"
          className="text-amber-500 text-sm mt-2 inline-block"
        >
          ← Back to list
        </Link>
      </div>
    );
  }

  const isPending = manufacturer.verificationStatus === "unverified";

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/manufacturers"
        className="text-slate-500 hover:text-slate-300 text-sm transition-colors mb-6 inline-block"
      >
        ← Back to Manufacturers
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-slate-50">
          {manufacturer.businessName}
        </h1>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            manufacturer.verificationStatus === "verified"
              ? "bg-emerald-900/60 text-emerald-400 border border-emerald-800"
              : manufacturer.verificationStatus === "suspended"
                ? "bg-red-900/60 text-red-400 border border-red-800"
                : "bg-amber-900/60 text-amber-400 border border-amber-800"
          }`}
        >
          {manufacturer.verificationStatus?.toUpperCase()}
        </span>
      </div>

      <div className="space-y-6">
        {/* Business Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Business Information
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ["Business Name", manufacturer.businessName],
              [
                "Contact Person",
                manufacturer.contactPerson || manufacturer.name,
              ],
              ["Email", manufacturer.businessEmail || manufacturer.email],
              [
                "Phone",
                manufacturer.businessPhone || manufacturer.phone || "—",
              ],
              ["Reg. Number", manufacturer.businessRegistrationNumber || "—"],
              ["City", manufacturer.businessAddress?.city || "—"],
              ["Country", manufacturer.businessAddress?.country || "—"],
              [
                "Joined",
                new Date(manufacturer.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-slate-600 text-xs mb-0.5">{label}</p>
                <p className="text-slate-200">{value}</p>
              </div>
            ))}
          </div>

          {manufacturer.businessDescription && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-slate-600 text-xs mb-1">
                Business Description
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {manufacturer.businessDescription}
              </p>
            </div>
          )}
        </div>

        {/* Capabilities & Materials */}
        {(manufacturer.manufacturingCapabilities?.length > 0 ||
          manufacturer.materialsAvailable?.length > 0) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
              Capabilities & Materials
            </h2>
            {manufacturer.manufacturingCapabilities?.length > 0 && (
              <div className="mb-4">
                <p className="text-slate-600 text-xs mb-2">
                  Manufacturing Capabilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {manufacturer.manufacturingCapabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2.5 py-1 bg-sky-900/40 text-sky-400 border border-sky-800/40 text-xs rounded-lg"
                    >
                      {cap.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {manufacturer.materialsAvailable?.length > 0 && (
              <div>
                <p className="text-slate-600 text-xs mb-2">
                  Materials Available
                </p>
                <div className="flex flex-wrap gap-2">
                  {manufacturer.materialsAvailable.map((mat) => (
                    <span
                      key={mat}
                      className="px-2.5 py-1 bg-emerald-900/40 text-emerald-400 border border-emerald-800/40 text-xs rounded-lg"
                    >
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Submitted Documents
          </h2>
          {manufacturer.verificationDocuments?.documents?.length > 0 ? (
            <div className="space-y-2">
              {manufacturer.verificationDocuments.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">📄</span>
                    <span className="text-slate-300 text-sm capitalize">
                      {doc.type?.replace(/_/g, " ") || "Document"}
                    </span>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-400 text-xs font-medium transition-colors"
                  >
                    View Document →
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No documents submitted</p>
          )}
        </div>

        {/* Review Checklist (only for pending) */}
        {isPending && (
          <div className="bg-slate-900 border border-amber-800/40 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
              Review Checklist
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
          <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-6">
            <h2 className="text-red-400 font-semibold text-sm mb-2">
              Rejection Reason
            </h2>
            <p className="text-red-300 text-sm">
              {manufacturer.rejectionReason}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {isPending && (
          <div className="flex gap-3">
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              ✓ Approve Manufacturer
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              ✗ Reject Application
            </button>
            <button
              onClick={() => handleAction("request_info")}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Request More Info
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
