// app/admin/manufacturers/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-50">
          Manufacturer Verification
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review and approve manufacturer applications
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-amber-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          Loading manufacturers...
        </div>
      ) : manufacturers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500">No {filter} manufacturers found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {manufacturers.map((m) => (
            <div
              key={m._id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-slate-50 font-semibold text-lg">
                      {m.businessName}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        m.verificationStatus === "verified"
                          ? "bg-emerald-900/60 text-emerald-400 border border-emerald-800"
                          : m.verificationStatus === "suspended"
                            ? "bg-red-900/60 text-red-400 border border-red-800"
                            : "bg-amber-900/60 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {m.verificationStatus?.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm mb-4">
                    <div className="flex gap-2">
                      <span className="text-slate-600 w-28 shrink-0">
                        Contact
                      </span>
                      <span className="text-slate-300">
                        {m.contactPerson || m.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-600 w-28 shrink-0">
                        Email
                      </span>
                      <span className="text-slate-300 truncate">
                        {m.businessEmail || m.email}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-600 w-28 shrink-0">
                        Phone
                      </span>
                      <span className="text-slate-300">
                        {m.businessPhone || m.phone || "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-600 w-28 shrink-0">
                        Reg. #
                      </span>
                      <span className="text-slate-300">
                        {m.businessRegistrationNumber || "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-600 w-28 shrink-0">
                        Location
                      </span>
                      <span className="text-slate-300">
                        {[m.businessAddress?.city, m.businessAddress?.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-600 w-28 shrink-0">
                        Joined
                      </span>
                      <span className="text-slate-300">
                        {new Date(m.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {m.manufacturingCapabilities?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-slate-600 text-xs font-medium uppercase tracking-wider mb-1.5">
                        Capabilities
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.manufacturingCapabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-0.5 bg-sky-900/40 text-sky-400 border border-sky-800/40 text-xs rounded"
                          >
                            {cap.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.verificationDocuments?.documents?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-slate-600 text-xs font-medium uppercase tracking-wider mb-1.5">
                        Documents Submitted
                      </p>
                      <div className="space-y-1">
                        {m.verificationDocuments.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-slate-600">📄</span>
                            <span className="text-slate-400 capitalize">
                              {doc.type?.replace(/_/g, " ")}
                            </span>
                            <span className="text-slate-600">—</span>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-500 hover:text-amber-400 text-xs underline"
                            >
                              {doc.filename || "View"}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.rejectionReason && (
                    <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-lg text-sm">
                      <span className="text-red-400 font-medium">
                        Rejection reason:{" "}
                      </span>
                      <span className="text-red-300">{m.rejectionReason}</span>
                    </div>
                  )}
                </div>

                {/* Detail link */}
                <Link
                  href={`/admin/manufacturers/${m._id}`}
                  className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Full Review →
                </Link>
              </div>

              {/* Action buttons for pending */}
              {m.verificationStatus === "unverified" && (
                <div className="flex gap-3 pt-4 mt-4 border-t border-slate-800">
                  <button
                    onClick={() => handleVerify(String(m._id), "approve")}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("Rejection reason (optional):");
                      if (reason !== null)
                        handleVerify(String(m._id), "reject", reason);
                    }}
                    className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={() => {
                      const info = prompt(
                        "What additional information is needed?",
                      );
                      if (info)
                        handleVerify(String(m._id), "request_info", info);
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                  >
                    Request Info
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
