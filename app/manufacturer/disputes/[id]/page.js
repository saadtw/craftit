"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ManufacturerNav from "@/components/Manufacturernav";

const STATUS_COLORS = {
  open: "bg-orange-100 text-orange-700",
  manufacturer_responded: "bg-blue-100 text-blue-700",
  under_review: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const RESOLUTION_LABELS = {
  refund_customer: "Refund issued to customer",
  side_with_manufacturer: "Resolved in your favour",
  partial_resolution: "Partial refund issued",
};

export default function ManufacturerDisputeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responseForm, setResponseForm] = useState({ comment: "" });
  const [error, setError] = useState("");

  const fetchDispute = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes/${id}`);
      const data = await res.json();
      if (data.dispute) setDispute(data.dispute);
      else router.push("/manufacturer/disputes");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

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
      fetchDispute();
    }
  }, [status, session, router, fetchDispute]);

  const submitResponse = async () => {
    if (
      !responseForm.comment.trim() ||
      responseForm.comment.trim().length < 20
    ) {
      setError("Please provide a detailed response (at least 20 characters).");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manufacturer_respond",
          comment: responseForm.comment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDispute(data.dispute);
      } else {
        setError(data.error || "Failed to submit response.");
      }
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!dispute) return null;

  const hasResponded = !!dispute.manufacturerResponse?.comment;
  const isResolved = ["resolved", "closed"].includes(dispute.status);

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <ManufacturerNav session={session} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/manufacturer/disputes"
            className="text-sm text-gray-500 hover:text-orange-500"
          >
            ← Disputes
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-mono font-bold text-gray-700">
            {dispute.disputeNumber}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[dispute.status] || "bg-gray-100 text-gray-500"}`}
          >
            {dispute.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="space-y-5">
          {/* Customer complaint */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-blue-900 mb-4">
              Customer Complaint
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Issue type</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {dispute.issueType?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">
                    Desired resolution
                  </p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {dispute.desiredResolution?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Customer&apos;s description
                </p>
                <p className="text-gray-700 bg-orange-50 rounded-xl p-3 border border-orange-100">
                  {dispute.description}
                </p>
              </div>
              {dispute.customerEvidence?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Evidence provided
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {dispute.customerEvidence.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-xs underline hover:text-blue-800"
                      >
                        File {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order reference */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-blue-900 mb-3">
              Linked Order
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold text-gray-900">
                  {dispute.orderId?.orderNumber}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Customer: {dispute.customerId?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-500">
                  ${dispute.orderId?.totalPrice?.toLocaleString()}
                </p>
                <Link
                  href={`/manufacturer/orders/${dispute.orderId?._id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Order →
                </Link>
              </div>
            </div>
          </div>

          {/* Your response */}
          {!isResolved && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-blue-900 mb-4">
                {hasResponded
                  ? "Your Response (Submitted)"
                  : "Submit Your Response"}
              </h2>

              {hasResponded ? (
                <div>
                  <p className="text-gray-700 bg-blue-50 rounded-xl p-3 border border-blue-100 text-sm">
                    {dispute.manufacturerResponse.comment}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Responded on{" "}
                    {new Date(
                      dispute.manufacturerResponse.respondedAt,
                    ).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    Admin is reviewing this dispute. You will be notified of the
                    resolution.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Please provide your side of the situation. Admin will review
                    both sides and make a final decision. You have{" "}
                    <span className="font-semibold text-orange-600">
                      48 hours
                    </span>{" "}
                    to respond.
                  </p>
                  <textarea
                    value={responseForm.comment}
                    onChange={(e) =>
                      setResponseForm({ comment: e.target.value })
                    }
                    rows={5}
                    placeholder="Explain what happened from your perspective. Include any relevant details about the order, delivery, and communication with the customer..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-orange-400"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    onClick={submitResponse}
                    disabled={submitting}
                    className="w-full py-3 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 text-sm"
                  >
                    {submitting ? "Submitting..." : "Submit Response"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolution */}
          {isResolved && dispute.resolution && (
            <div
              className={`rounded-2xl border p-6 ${dispute.resolution === "refund_customer" ? "bg-red-50 border-red-100" : dispute.resolution === "side_with_manufacturer" ? "bg-green-50 border-green-100" : "bg-blue-50 border-blue-100"}`}
            >
              <h2 className="text-base font-bold text-gray-900 mb-3">
                Resolution
              </h2>
              <p className="font-semibold text-gray-900 mb-2">
                {RESOLUTION_LABELS[dispute.resolution]}
              </p>
              {dispute.resolutionMessage && (
                <p className="text-sm text-gray-700">
                  {dispute.resolutionMessage}
                </p>
              )}
              {dispute.resolutionAmount && (
                <p className="text-sm text-gray-600 mt-1">
                  Amount:{" "}
                  <span className="font-bold">
                    ${dispute.resolutionAmount.toLocaleString()}
                  </span>
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Resolved on {new Date(dispute.resolvedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
