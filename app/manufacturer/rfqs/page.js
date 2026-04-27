// app/manufacturer/rfqs/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function ManufacturerRFQsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "active",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
  });
  const [sortBy, setSortBy] = useState("newest");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "manufacturer")
      return;
    let cancelled = false;
    const params = new URLSearchParams();
    params.append("status", filters.status || "active");
    fetch(`/api/rfqs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.rfqs) setRfqs(data.rfqs);
        else
          console.error(
            "Error loading RFQs: " + (data.error || "Unknown error"),
          );
      })
      .catch((err) => {
        if (!cancelled) console.error("Error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session, filters, sortBy, refreshKey]);

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const resetFilters = () => {
    setLoading(true);
    setFilters({
      status: "active",
      budgetMin: "",
      budgetMax: "",
      deadline: "",
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <div className="text-xl text-gray-600">Loading...</div>
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
          <span className="text-gray-900 font-medium">RFQs</span>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-blue-900">Available RFQs</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-28 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-blue-900 mb-4">
                Filter RFQs
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => {
                      setLoading(true);
                      setFilters({ ...filters, status: e.target.value });
                    }}
                    className="w-full rounded-lg border-gray-300 bg-white focus:border-orange-500 focus:ring-orange-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="bid_accepted">Bid Accepted</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$100</span>
                    <span>$10,000+</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deadline Before
                  </label>
                  <input
                    type="date"
                    value={filters.deadline}
                    onChange={(e) => {
                      setLoading(true);
                      setFilters({ ...filters, deadline: e.target.value });
                    }}
                    className="w-full rounded-lg border-gray-300 bg-white focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setLoading(true);
                      setRefreshKey((k) => k + 1);
                    }}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition"
                  >
                    Apply
                  </button>
                  <button
                    onClick={resetFilters}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* RFQs List */}
          <div className="lg:col-span-3 space-y-8">
            {/* Sort Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => {
                  setLoading(true);
                  setSortBy("newest");
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  sortBy === "newest"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Newest ▼
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  setSortBy("ending_soon");
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  sortBy === "ending_soon"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Ending Soon
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  setSortBy("highest_budget");
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  sortBy === "highest_budget"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Highest Budget
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  setSortBy("best_match");
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  sortBy === "best_match"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }}`}
              >
                Best Match
              </button>
            </div>

            {/* Recommended RFQs Section */}
            <div>
              <h2 className="text-xl font-bold text-blue-900 mb-4">
                Recommended RFQs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rfqs.slice(0, 2).map((rfq) => (
                  <div
                    key={rfq._id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition p-5"
                  >
                    {rfq.customOrderId?.model3D?.url && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                          3D Model Available
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-base font-bold text-blue-900">
                          {rfq.customOrderId?.title || "Untitled RFQ"}
                        </h3>
                        <p className="text-xs text-gray-500">
                          RFQ-ID: {rfq.rfqNumber}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rfq.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {rfq.status === "active" ? "Open" : "Ending Soon"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {rfq.customOrderId?.description ||
                        "No description available"}
                    </p>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                      <div>
                        <span className="text-gray-500 font-medium">
                          Quantity:
                        </span>{" "}
                        <span className="text-gray-700">
                          {rfq.customOrderId?.quantity || "N/A"} units
                        </span>
                      </div>
                      {rfq.customOrderId?.materialPreferences?.[0] && (
                        <div>
                          <span className="text-gray-500 font-medium">
                            Material:
                          </span>{" "}
                          <span className="text-gray-700">
                            {rfq.customOrderId.materialPreferences[0]}
                          </span>
                        </div>
                      )}
                      {rfq.customOrderId?.deadline && (
                        <div>
                          <span className="text-gray-500 font-medium">
                            Deadline:
                          </span>{" "}
                          <span className="text-gray-700">
                            {new Date(
                              rfq.customOrderId.deadline,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {rfq.customOrderId?.budget && (
                        <div>
                          <span className="text-gray-500 font-medium">
                            Budget:
                          </span>{" "}
                          <span className="text-gray-700">
                            ${rfq.customOrderId.budget}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <Link
                        href={`/manufacturer/rfqs/${rfq._id}`}
                        className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 text-sm transition"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/manufacturer/rfqs/${rfq._id}/bid`}
                        className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 text-sm transition"
                      >
                        Place Bid
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All RFQs Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-blue-900">All RFQs</h2>

              {loading ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <div className="text-gray-600">Loading RFQs...</div>
                </div>
              ) : rfqs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <p className="text-gray-500">
                    No RFQs found matching your criteria
                  </p>
                </div>
              ) : (
                rfqs.map((rfq) => (
                  <div
                    key={rfq._id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition p-5"
                  >
                    {rfq.customOrderId?.model3D?.url && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                          3D Model Available
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-5">
                      {rfq.customOrderId?.images?.[0]?.url && (
                        <div className="relative w-full md:w-40 h-40 shrink-0 rounded-lg overflow-hidden">
                          <Image
                            src={rfq.customOrderId.images[0].url}
                            alt={rfq.customOrderId.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-blue-900">
                              {rfq.customOrderId?.title || "Untitled RFQ"}
                            </h3>
                            <p className="text-xs text-gray-500">
                              RFQ-ID: {rfq.rfqNumber}
                            </p>
                          </div>
                          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                            🔖
                          </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                          {rfq.customOrderId?.description ||
                            "No description available"}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-gray-200 pt-4">
                          <div>
                            <p className="text-gray-500">Quantity</p>
                            <p className="font-semibold text-gray-800">
                              {rfq.customOrderId?.quantity || "N/A"} units
                            </p>
                          </div>
                          {rfq.customOrderId?.materialPreferences?.[0] && (
                            <div>
                              <p className="text-gray-500">Material</p>
                              <p className="font-semibold text-gray-800">
                                {rfq.customOrderId.materialPreferences[0]}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-500">Time Remaining</p>
                            <p className="font-semibold text-orange-600">
                              {getTimeRemaining(rfq.endDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Current Bids</p>
                            <p className="font-semibold text-gray-800">
                              {rfq.bidsCount || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 border-t border-gray-200 pt-4">
                      <Link
                        href={`/manufacturer/rfqs/${rfq._id}`}
                        className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 text-sm transition"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/manufacturer/rfqs/${rfq._id}/bid`}
                        className="px-8 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 text-sm transition"
                      >
                        Place Bid
                      </Link>
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
