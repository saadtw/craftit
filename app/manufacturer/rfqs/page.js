"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManufacturerRFQsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "active",
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchRFQs();
    }
  }, [filters, status]);

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);

      const response = await fetch(`/api/rfqs?${params}`);
      const data = await response.json();

      if (data.success && data.rfqs) {
        setRfqs(data.rfqs);
      } else {
        alert("Error loading RFQs: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error loading RFQs");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `${days}d ${hours}h`;
  };

  if (status === "loading") return <div className="p-6">Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return <div className="p-6">Redirecting to login...</div>;
  }

  if (session?.user?.role !== "manufacturer") {
    return <div className="p-6">Access denied. Manufacturers only.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Available RFQs</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <label className="block mb-2 font-semibold">Filter by Status</label>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="w-full border p-2 rounded max-w-xs"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="bid_accepted">Bid Accepted</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* RFQ List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : rfqs.length === 0 ? (
        <div className="text-center text-gray-500 py-8 bg-white rounded shadow">
          No RFQs found matching your criteria
        </div>
      ) : (
        <div className="grid gap-4">
          {rfqs.map((rfq) => (
            <Link
              key={rfq._id}
              href={`/manufacturer/rfqs/${rfq._id}`}
              className="block bg-white p-6 rounded shadow hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">
                      {rfq.customOrderId?.title || "Untitled RFQ"}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        rfq.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {rfq.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-3 line-clamp-2">
                    {rfq.customOrderId?.description || "No description"}
                  </p>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    {rfq.customOrderId?.quantity && (
                      <div>
                        <span className="text-gray-600">Quantity: </span>
                        <span className="font-semibold">
                          {rfq.customOrderId.quantity}
                        </span>
                      </div>
                    )}
                    {rfq.customOrderId?.budget && (
                      <div>
                        <span className="text-gray-600">Budget: </span>
                        <span className="font-semibold">
                          ${rfq.customOrderId.budget}
                        </span>
                      </div>
                    )}
                    {rfq.minBidThreshold > 0 && (
                      <div>
                        <span className="text-gray-600">Min Bid: </span>
                        <span className="font-semibold">
                          ${rfq.minBidThreshold}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Bids: </span>
                      <span className="font-semibold">
                        {rfq.bidsCount || 0}
                      </span>
                    </div>
                  </div>

                  {rfq.customOrderId?.materialPreferences &&
                    rfq.customOrderId.materialPreferences.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-600">
                          Materials:{" "}
                        </span>
                        <span className="text-xs font-semibold">
                          {rfq.customOrderId.materialPreferences.join(", ")}
                        </span>
                      </div>
                    )}
                </div>

                <div className="text-right ml-6">
                  {rfq.status === "active" && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Time Left</p>
                      <p className="text-lg font-bold text-blue-600">
                        {getTimeRemaining(rfq.endDate)}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Posted: {new Date(rfq.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
