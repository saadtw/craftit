"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function AdminDisputeDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  // Resolution form state
  const [resolution, setResolution] = useState("refund_customer");
  const [refundAmount, setRefundAmount] = useState("");
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

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
      fetchDispute();
    }
  }, [status, session, id]);

  const fetchDispute = async () => {
    try {
      const res = await fetch(`/api/disputes/${id}`);
      const data = await res.json();
      if (data.dispute) setDispute(data.dispute);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionMessage.trim()) {
      alert("Resolution message is required.");
      return;
    }
    if (resolution === "refund_customer" && !refundAmount) {
      alert("Please enter the refund amount.");
      return;
    }

    setResolving(true);
    try {
      const body = {
        action: "admin_resolve",
        resolution,
        resolutionMessage,
        adminNotes,
      };
      if (
        resolution === "refund_customer" ||
        resolution === "partial_resolution"
      ) {
        body.resolutionAmount = parseFloat(refundAmount);
      }

      const res = await fetch(`/api/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await fetchDispute();
        alert("Dispute resolved successfully.");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setResolving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Dispute not found.</p>
        <Link
          href="/admin/disputes"
          className="text-amber-500 text-sm mt-2 inline-block"
        >
          ← Back to Disputes
        </Link>
      </div>
    );
  }

  const isResolved = dispute.status === "resolved";

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/disputes"
        className="text-slate-500 hover:text-slate-300 text-sm transition-colors mb-6 inline-block"
      >
        ← Back to Disputes
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-slate-50 font-mono">
          {dispute.disputeNumber}
        </h1>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            dispute.status === "resolved"
              ? "bg-emerald-900/60 text-emerald-400 border-emerald-800"
              : dispute.status === "under_review" ||
                  dispute.status === "manufacturer_responded"
                ? "bg-yellow-900/60 text-yellow-400 border-yellow-800"
                : "bg-red-900/60 text-red-400 border-red-800"
          }`}
        >
          {dispute.status?.replace(/_/g, " ")}
        </span>
      </div>

      <div className="space-y-6">
        {/* Parties */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-600 text-xs uppercase tracking-wider mb-2">
              Customer (Filed By)
            </p>
            <p className="text-slate-200 font-medium">
              {dispute.customerId?.name || "—"}
            </p>
            <p className="text-slate-500 text-sm">
              {dispute.customerId?.email || "—"}
            </p>
            {dispute.customerId?._id && (
              <Link
                href={`/admin/users/${dispute.customerId._id}`}
                className="text-amber-500 text-xs mt-2 inline-block hover:text-amber-400"
              >
                View Profile →
              </Link>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-600 text-xs uppercase tracking-wider mb-2">
              Manufacturer
            </p>
            <p className="text-slate-200 font-medium">
              {dispute.manufacturerId?.businessName ||
                dispute.manufacturerId?.name ||
                "—"}
            </p>
            <p className="text-slate-500 text-sm">
              {dispute.manufacturerId?.email || "—"}
            </p>
          </div>
        </div>

        {/* Dispute Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Dispute Details
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
            <div>
              <p className="text-slate-600 text-xs mb-0.5">Order</p>
              <Link
                href={`/admin/orders/${dispute.orderId?._id}`}
                className="text-amber-500 font-mono text-sm hover:text-amber-400"
              >
                {dispute.orderId?.orderNumber || "—"}
              </Link>
            </div>
            <div>
              <p className="text-slate-600 text-xs mb-0.5">Issue Type</p>
              <p className="text-slate-200 capitalize">
                {dispute.issueType?.replace(/_/g, " ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs mb-0.5">
                Desired Resolution
              </p>
              <p className="text-slate-200 capitalize">
                {dispute.desiredResolution?.replace(/_/g, " ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs mb-0.5">Filed On</p>
              <p className="text-slate-200">
                {new Date(dispute.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-slate-600 text-xs mb-2">
              Customer&apos;s Description
            </p>
            <p className="text-slate-300 text-sm leading-relaxed bg-slate-800 rounded-lg p-3">
              {dispute.description || "—"}
            </p>
          </div>
        </div>

        {/* Customer Evidence */}
        {dispute.customerEvidence?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
              Evidence (Customer)
            </h2>
            <div className="space-y-2">
              {dispute.customerEvidence.map((item, idx) => {
                const evidenceUrl = typeof item === "string" ? item : item?.url;
                const evidenceLabel =
                  typeof item === "string"
                    ? `Evidence ${idx + 1}`
                    : item?.filename || `Evidence ${idx + 1}`;

                if (!evidenceUrl) return null;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                  >
                    <span className="text-slate-300 text-sm">
                      📎 {evidenceLabel}
                    </span>
                    <a
                      href={evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-500 hover:text-amber-400 text-xs"
                    >
                      View →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manufacturer Response */}
        {dispute.manufacturerResponse && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-3">
              Manufacturer Response
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed bg-slate-800 rounded-lg p-3">
              {dispute.manufacturerResponse.comment}
            </p>
            <p className="text-slate-600 text-xs mt-2">
              Responded:{" "}
              {new Date(
                dispute.manufacturerResponse.respondedAt,
              ).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Resolution (if already resolved) */}
        {isResolved && dispute.resolution && (
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-6">
            <h2 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3">
              Resolution
            </h2>
            <p className="text-slate-300 text-sm capitalize mb-2">
              <span className="text-slate-500">Decision: </span>
              {dispute.resolution?.replace(/_/g, " ")}
            </p>
            {dispute.resolutionAmount > 0 && (
              <p className="text-slate-300 text-sm mb-2">
                <span className="text-slate-500">Refund Amount: </span>$
                {dispute.resolutionAmount}
              </p>
            )}
            <p className="text-slate-300 text-sm leading-relaxed bg-slate-800 rounded-lg p-3 mt-2">
              {dispute.resolutionMessage}
            </p>
          </div>
        )}

        {/* Admin Notes */}
        {dispute.adminNotes && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
            <h2 className="text-slate-400 text-sm font-medium mb-2">
              Internal Notes
            </h2>
            <p className="text-slate-500 text-sm">{dispute.adminNotes}</p>
          </div>
        )}

        {/* Resolution Form */}
        {!isResolved && (
          <div className="bg-slate-900 border border-amber-800/40 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
              Resolve Dispute
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1.5">
                  Decision
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: "refund_customer",
                      label: "Refund Customer",
                      desc: "Rule in favor of customer, process refund",
                    },
                    {
                      value: "side_with_manufacturer",
                      label: "Side with Manufacturer",
                      desc: "No refund, manufacturer not at fault",
                    },
                    {
                      value: "partial_resolution",
                      label: "Partial Resolution",
                      desc: "Compromise — partial refund",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        resolution === opt.value
                          ? "border-amber-600 bg-amber-950/30"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resolution"
                        value={opt.value}
                        checked={resolution === opt.value}
                        onChange={(e) => setResolution(e.target.value)}
                        className="mt-0.5 text-amber-600 focus:ring-amber-600"
                      />
                      <div>
                        <p className="text-slate-200 text-sm font-medium">
                          {opt.label}
                        </p>
                        <p className="text-slate-500 text-xs">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {(resolution === "refund_customer" ||
                resolution === "partial_resolution") && (
                <div>
                  <label className="text-slate-400 text-sm block mb-1.5">
                    Refund Amount (USD){" "}
                    {resolution === "refund_customer" ? "" : "— partial"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg pl-7 pr-4 py-2 text-sm focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 text-sm block mb-1.5">
                  Resolution Message (sent to both parties)
                </label>
                <textarea
                  value={resolutionMessage}
                  onChange={(e) => setResolutionMessage(e.target.value)}
                  rows={4}
                  placeholder="Explain the decision and resolution..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm block mb-1.5">
                  Internal Notes (admin only, optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes for audit trail..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleResolve}
                disabled={resolving}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                {resolving ? "Resolving..." : "Finalize Resolution"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
