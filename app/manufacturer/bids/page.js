// app/manufacturer/bids/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManufacturerBidsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    pending: false,
    accepted: false,
    rejected: false,
    withdrawn: false,
    dateFrom: "",
    dateTo: "",
  });
  const [sortBy, setSortBy] = useState("newest");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchBids = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };
  const [stats, setStats] = useState({
    totalBids: 0,
    acceptanceRate: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "manufacturer")
      return;
    let cancelled = false;
    fetch("/api/bids?manufacturerId=" + session.user.id)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !data.bids) return;

        // Compute stats from raw data before filtering
        const total = data.bids.length;
        const accepted = data.bids.filter(
          (b) => b.status === "accepted",
        ).length;
        setStats({
          totalBids: total,
          acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
          avgResponseTime: 2.5,
        });

        // Apply status filters
        let filteredBids = data.bids;
        const activeStatuses = [];
        if (filters.pending)
          activeStatuses.push("pending", "under_consideration");
        if (filters.accepted) activeStatuses.push("accepted");
        if (filters.rejected) activeStatuses.push("rejected");
        if (filters.withdrawn) activeStatuses.push("withdrawn");
        if (activeStatuses.length > 0) {
          filteredBids = filteredBids.filter((bid) =>
            activeStatuses.includes(bid.status),
          );
        }

        // Apply date filters
        if (filters.dateFrom) {
          filteredBids = filteredBids.filter(
            (bid) => new Date(bid.createdAt) >= new Date(filters.dateFrom),
          );
        }
        if (filters.dateTo) {
          filteredBids = filteredBids.filter(
            (bid) => new Date(bid.createdAt) <= new Date(filters.dateTo),
          );
        }

        // Sort
        filteredBids.sort((a, b) => {
          switch (sortBy) {
            case "newest":
              return new Date(b.createdAt) - new Date(a.createdAt);
            case "oldest":
              return new Date(a.createdAt) - new Date(b.createdAt);
            case "highest_bid":
              return b.amount - a.amount;
            case "lowest_bid":
              return a.amount - b.amount;
            default:
              return 0;
          }
        });

        setBids(filteredBids);
      })
      .catch((error) => console.error("Error:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session, filters, sortBy, refreshKey]);

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "pending":
      case "under_consideration":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "withdrawn":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (session?.user?.role !== "manufacturer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <div className="text-xl text-red-600">
          Access Denied. Manufacturers only.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Link
            href="/manufacturer/dashboard"
            className="text-gray-500 hover:text-gray-700"
          >
            Dashboard
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-900 font-medium">My Bids</span>
        </div>

        {/* Page Title */}
        <h1 className="text-4xl font-black text-blue-900 mb-8">My Bids</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Filter Bids */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-4">
                  Filter Bids
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.pending}
                          onChange={(e) => {
                            setLoading(true);
                            setFilters({
                              ...filters,
                              pending: e.target.checked,
                            });
                          }}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-600">Pending</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.accepted}
                          onChange={(e) => {
                            setLoading(true);
                            setFilters({
                              ...filters,
                              accepted: e.target.checked,
                            });
                          }}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-600">Accepted</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.rejected}
                          onChange={(e) => {
                            setLoading(true);
                            setFilters({
                              ...filters,
                              rejected: e.target.checked,
                            });
                          }}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-600">Rejected</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.withdrawn}
                          onChange={(e) => {
                            setLoading(true);
                            setFilters({
                              ...filters,
                              withdrawn: e.target.checked,
                            });
                          }}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-600">Withdrawn</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => {
                        setLoading(true);
                        setFilters({ ...filters, dateFrom: e.target.value });
                      }}
                      className="w-full rounded-lg border-gray-300 text-sm mb-2"
                    />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => {
                        setLoading(true);
                        setFilters({ ...filters, dateTo: e.target.value });
                      }}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <button
                    onClick={fetchBids}
                    className="w-full px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* Saved RFQs */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-3">
                  Saved RFQs
                </h3>
                <div className="space-y-2">
                  <a
                    href="#"
                    className="text-sm text-orange-500 hover:underline block"
                  >
                    High-Tolerance Gear Assembly
                  </a>
                  <a
                    href="#"
                    className="text-sm text-orange-500 hover:underline block"
                  >
                    Aerospace Bracket Prototypes
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-600 text-base font-medium mb-1">
                  Total Bids Placed
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.totalBids}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-600 text-base font-medium mb-1">
                  Acceptance Rate
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.acceptanceRate}%
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-600 text-base font-medium mb-1">
                  Avg Response Time
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.avgResponseTime} days
                </p>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex justify-end mb-4">
              <select
                value={sortBy}
                onChange={(e) => {
                  setLoading(true);
                  setSortBy(e.target.value);
                }}
                className="rounded-lg border-gray-300 text-sm focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="highest_bid">Sort by: Highest Bid</option>
                <option value="lowest_bid">Sort by: Lowest Bid</option>
              </select>
            </div>

            {/* Bids List */}
            <div className="space-y-4">
              {bids.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <GlobalNoResults text="No bids found" />
                </div>
              ) : (
                bids.map((bid) => (
                  <div
                    key={bid._id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition p-4"
                  >
                    {bid.rfqId?.customOrderId?.model3D?.url && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                          3D Model Available
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-4">
                      {bid.rfqId?.customOrderId?.images?.[0]?.url && (
                        <div
                          className="w-full md:w-32 h-32 bg-gray-100 rounded-lg bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${bid.rfqId.customOrderId.images[0].url})`,
                          }}
                        />
                      )}

                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-lg font-bold text-blue-900">
                              {bid.rfqId?.customOrderId?.title || "RFQ"}
                            </h4>
                            <p className="text-xs text-gray-500">
                              RFQ ID: {bid.rfqId?.rfqNumber}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${getStatusColor(
                              bid.status,
                            )}`}
                          >
                            {bid.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {bid.rfqId?.customOrderId?.description ||
                            "No description"}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500 font-medium">
                              Quantity:{" "}
                            </span>
                            <strong className="text-gray-800">
                              {bid.rfqId?.customOrderId?.quantity || "N/A"}{" "}
                              units
                            </strong>
                          </div>
                          {bid.rfqId?.customOrderId
                            ?.materialPreferences?.[0] && (
                            <div>
                              <span className="text-gray-500 font-medium">
                                Material:{" "}
                              </span>
                              <strong className="text-gray-800">
                                {bid.rfqId.customOrderId.materialPreferences[0]}
                              </strong>
                            </div>
                          )}
                          {bid.rfqId?.customOrderId?.deadline && (
                            <div>
                              <span className="text-gray-500 font-medium">
                                Deadline:{" "}
                              </span>
                              <strong className="text-gray-800">
                                {new Date(
                                  bid.rfqId.customOrderId.deadline,
                                ).toLocaleDateString()}
                              </strong>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 font-medium">
                              Your Bid:{" "}
                            </span>
                            <strong className="text-orange-500">
                              ${bid.amount.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3 flex flex-wrap items-center justify-between gap-3 mt-3">
                      <div className="text-sm text-gray-500">
                        Bid Placed:{" "}
                        {new Date(
                          bid.submittedAt || bid.createdAt,
                        ).toLocaleDateString()}
                        {bid.status === "under_consideration" && (
                          <>
                            <span className="mx-2">|</span>
                            <strong className="text-orange-500">
                              Counter Offer Received
                            </strong>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/bids/${bid._id}`}
                          className="px-4 py-2 bg-gray-100 text-gray-800 font-bold rounded-lg hover:bg-gray-200 text-sm"
                        >
                          View Details
                        </Link>
                        {bid.status === "under_consideration" && (
                          <Link
                            href={`/bids/${bid._id}`}
                            className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 text-sm"
                          >
                            Respond to Counter
                          </Link>
                        )}
                        {bid.status === "pending" && (
                          <Link
                            href={`/bids/${bid._id}`}
                            className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 text-sm"
                          >
                            💬 Chat
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-4">
            <a href="#" className="text-gray-600 hover:text-orange-500 text-sm">
              Help
            </a>
            <a href="#" className="text-gray-600 hover:text-orange-500 text-sm">
              Terms & Conditions
            </a>
            <a href="#" className="text-gray-600 hover:text-orange-500 text-sm">
              Contact Support
            </a>
          </div>
          <p className="text-sm text-gray-500">
            © 2024 Craftit, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
