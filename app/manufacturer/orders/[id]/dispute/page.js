// app/manufacturer/orders/[id]/dispute/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ChatBox from "@/components/chat/ChatBox";
import { useToast } from "@/components/ui/ToastProvider";
import { uploadFileDirect } from "@/lib/uploadDirect";

const ISSUE_TYPES = [
  { value: "payment_release_rejected", label: "Payment release request rejected" },
  { value: "customer_unresponsive", label: "Customer is unresponsive" },
  { value: "other", label: "Other" },
];

const RESOLUTION_TYPES = [
  { value: "release_payment", label: "Release full payment" },
  { value: "partial_release", label: "Release partial payment" },
  { value: "other", label: "Other resolution" },
];

export default function ManufacturerDisputePage() {
  const { id: orderId } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingDispute, setExistingDispute] = useState(null);

  const [form, setForm] = useState({
    issueType: "",
    description: "",
    desiredResolution: "",
    customerEvidence: [],
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const toast = useToast();

  const fetchOrder = useCallback(async () => {
    try {
      const [orderRes, disputesRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch(`/api/disputes?orderId=${orderId}`),
      ]);

      const orderData = await orderRes.json();
      if (orderData.success) {
        setOrder(orderData.order);
      } else {
        router.push("/manufacturer/orders");
        return;
      }

      const disputeData = await disputesRes.json();
      if (disputeData.disputes?.length > 0) {
        const open = disputeData.disputes.find(
          (d) => d.orderId?._id === orderId || d.orderId === orderId,
        );
        if (open && !["resolved", "closed"].includes(open.status)) {
          setExistingDispute(open);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

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

  const handleSubmit = async () => {
    setError("");

    if (!form.issueType) {
      setError("Please select an issue type.");
      return;
    }
    if (!form.description || form.description.trim().length < 20) {
      setError("Please describe the issue in at least 20 characters.");
      return;
    }
    if (!form.desiredResolution) {
      setError("Please select your desired resolution.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          issueType: form.issueType,
          description: form.description.trim(),
          desiredResolution: form.desiredResolution,
          customerEvidence: form.customerEvidence, // Backend uses this field for both roles
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/manufacturer/orders/${orderId}?dispute=filed`);
      } else {
        setError(data.error || "Failed to file dispute. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading dispute form..." />;
  }

  if (existingDispute) {
    return (
      <div className="min-h-screen bg-[#050507] text-white">
        <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
          <Link
            href={`/manufacturer/orders/${orderId}`}
            className="mb-5 inline-flex text-sm font-semibold text-white/45 hover:text-purple-400"
          >
            ← Back to Order
          </Link>

          <section className="relative overflow-hidden rounded-[28px] border border-purple-500/20 bg-[#0c0c11] p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,51,234,0.14),transparent_35%)] pointer-events-none" />

            <div className="relative">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-500/25 bg-purple-500/10 text-purple-400">
                <span className="material-symbols-outlined text-5xl">
                  gavel
                </span>
              </div>

              <h2 className="text-2xl font-black text-white">
                Dispute Already Filed
              </h2>

              <p className="mt-2 text-sm text-white/55">
                There is already an open dispute for this order.
              </p>

              <p className="mt-2 text-xs text-white/40">
                Case #{existingDispute.disputeNumber} · Status:{" "}
                <span className="font-bold capitalize text-purple-400">
                  {existingDispute.status.replace("_", " ")}
                </span>
              </p>

              <Link
                href={`/manufacturer/orders/${orderId}`}
                className="mt-6 inline-flex rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white hover:bg-purple-500"
              >
                Back to Order
              </Link>
            </div>
          </section>

          {/* Chat Box */}
          <section className="bg-white/[0.03] mt-6 rounded-[28px] border-2 border-purple-500/20 overflow-hidden h-[600px] flex flex-col">
            <div className="px-6 py-4 border-b border-white/5 bg-[#0c0c11]">
              <h2 className="text-sm font-black uppercase tracking-widest text-purple-400">
                Dispute Discussion
              </h2>
            </div>
            <div className="flex-1 overflow-hidden bg-[#050507]">
              <ChatBox
                orderId={existingDispute._id}
                apiPrefix={`/api/disputes/${existingDispute._id}/messages`}
                currentUser={{ id: session.user.id, name: session.user.name, role: "manufacturer" }}
                orderNumber={`Dispute ${existingDispute.disputeNumber}`}
                otherParty={{ name: order?.customerId?.name || "Customer" }}
              />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6 space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.13),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative">
            <Link
              href={`/manufacturer/orders/${orderId}`}
              className="mb-4 inline-flex text-sm font-semibold text-white/45 hover:text-purple-400"
            >
              ← Back to Order
            </Link>

            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-purple-400">
              Order Dispute
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              File a Dispute
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Submit a dispute for this order. Our team will review your case
              after the customer has an opportunity to respond.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex gap-3">
          <span className="material-symbols-outlined text-blue-300 text-xl shrink-0 mt-0.5">
            info
          </span>
          <div className="text-sm text-blue-200/80">
            <p className="mb-1 font-bold text-blue-200">
              Before filing a dispute
            </p>
            <p>
              We recommend communicating with the customer first to resolve
              issues directly. If you cannot reach an agreement, our admin team will
              review your case within 48 hours.
            </p>
          </div>
        </section>

        {order && (
          <section className="rounded-2xl border border-white/8 bg-[#0c0c11] p-4 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/45">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>

            <div>
              <p className="text-xs text-white/35">Order</p>
              <p className="font-mono text-sm font-bold text-white">
                {order.orderNumber}
              </p>
            </div>

            <div className="ml-auto text-right">
              <p className="text-xs text-white/35">Amount</p>
              <p className="font-black text-purple-400">
                ${order.totalPrice?.toLocaleString()}
              </p>
            </div>
          </section>
        )}

        <section className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-bold text-white">
              What is the issue? *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ISSUE_TYPES.map((issue) => (
                <label
                  key={issue.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                    form.issueType === issue.value
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-purple-500/35 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="issueType"
                    value={issue.value}
                    checked={form.issueType === issue.value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, issueType: e.target.value }))
                    }
                    className="accent-purple-500"
                  />
                  <span className="text-sm text-white/75">{issue.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-white">
              Describe the issue *
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={5}
              placeholder="Please provide as much detail as possible — what was completed, why the release was requested, and any relevant communications..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-2 text-xs text-white/35">
              {form.description.length}/3000 characters
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-white">
              What resolution are you looking for? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RESOLUTION_TYPES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                    form.desiredResolution === r.value
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-purple-500/35 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="desiredResolution"
                    value={r.value}
                    checked={form.desiredResolution === r.value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        desiredResolution: e.target.value,
                      }))
                    }
                    className="accent-purple-500"
                  />
                  <span className="text-sm text-white/75">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-white">
              Evidence (Optional)
            </label>
            <div className="flex flex-col gap-3">
              {form.customerEvidence.map((url, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-purple-400">description</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:text-purple-400 truncate max-w-[200px] sm:max-w-md">
                      Attachment {i + 1}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      import("@/lib/fileCleanupClient").then(({ cleanupFiles }) => cleanupFiles([url]));
                      setForm(prev => ({ ...prev, customerEvidence: prev.customerEvidence.filter((_, idx) => idx !== i) }));
                    }}
                    className="text-white/40 hover:text-red-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                disabled={uploadingFiles}
                onClick={() => document.getElementById('dispute-file-upload').click()}
                className="w-full py-3 border-2 border-dashed border-purple-500/30 bg-purple-500/5 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all disabled:opacity-50"
              >
                {uploadingFiles ? (
                  <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-purple-400">upload_file</span>
                    <span className="text-[12px] font-bold text-white">Upload Evidence</span>
                  </>
                )}
              </button>
              <input
                id="dispute-file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (!files.length) return;
                  setUploadingFiles(true);
                  try {
                    const uploaded = await Promise.all(
                      files.map(f => uploadFileDirect(f, "document"))
                    );
                    const urls = uploaded.map(u => u.file ? u.file.url : u.url);
                    setForm(prev => ({
                      ...prev,
                      customerEvidence: [...prev.customerEvidence, ...urls]
                    }));
                  } catch (err) {
                    toast.error("File upload failed");
                  } finally {
                    setUploadingFiles(false);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Filing Dispute..." : "Submit Dispute"}
            </button>

            <Link
              href={`/manufacturer/orders/${orderId}`}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-center text-sm font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Link>
          </div>

          <p className="text-center text-xs leading-5 text-white/35">
            After filing, the customer has 48 hours to respond. Our admin team
            will review and resolve within 5 business days.
          </p>
        </section>
      </main>
    </div>
  );
}
