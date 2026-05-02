// app/manufacturer/disputes/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_COLORS = {
  open: "bg-orange-100 text-orange-700",
  manufacturer_responded: "bg-blue-100 text-blue-700",
  under_review: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-blue-900">Disputes</h1>
            {openCount > 0 && (
              <p className="text-sm text-orange-600 font-medium mt-0.5">
                {openCount} open dispute{openCount > 1 ? "s" : ""} requiring
                attention
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-5">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? "bg-blue-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-blue-900"
              }`}
            >
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">
              balance
            </span>
            <GlobalNoResults text="No disputes found" />
            <p className="text-sm text-gray-400 mt-1">
              {filter === "all"
                ? "No disputes have been filed on your orders."
                : `No disputes with status "${filter.replace(/_/g, " ")}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((dispute) => (
              <Link
                key={dispute._id}
                href={`/manufacturer/disputes/${dispute._id}`}
              >
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-orange-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[dispute.status] || "bg-gray-100 text-gray-500"}`}
                        >
                          {dispute.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {dispute.disputeNumber}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 mb-0.5">
                        {ISSUE_LABELS[dispute.issueType] || dispute.issueType}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {dispute.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>
                          Order:{" "}
                          <span className="font-mono font-semibold text-gray-600">
                            {dispute.orderId?.orderNumber}
                          </span>
                        </span>
                        <span>
                          Customer:{" "}
                          <span className="font-semibold text-gray-600">
                            {dispute.customerId?.name}
                          </span>
                        </span>
                        <span>
                          Filed:{" "}
                          {new Date(dispute.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">
                        ${dispute.orderId?.totalPrice?.toLocaleString()}
                      </p>
                      {dispute.status === "open" && (
                        <p className="text-xs text-orange-600 font-semibold mt-1">
                          Response needed
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
