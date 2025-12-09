"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RFQsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "active",
    category: "",
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
      if (filters.category) params.append("category", filters.category);

      const response = await fetch(`/api/rfqs?${params}`, {});
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

    return `${days}d ${hours}h remaining`;
  };

  if (status === "loading") return <div>Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return <div>Redirecting to login...</div>;
  }

  if (session?.user?.role !== "manufacturer") {
    return <div>Access denied. Manufacturers only.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Available RFQs</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-semibold">Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full border p-2 rounded"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="bid_accepted">Bid Accepted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold">Category</label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="w-full border p-2 rounded"
            >
              <option value="">All Categories</option>
              <option value="mechanical">Mechanical</option>
              <option value="electronics">Electronics</option>
              <option value="plastics">Plastics</option>
              <option value="metal">Metal Fabrication</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* RFQ List */}
      {loading ? (
        <div>Loading...</div>
      ) : rfqs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No RFQs found</div>
      ) : (
        <div className="grid gap-4">
          {rfqs.map((rfq) => (
            <Link
              key={rfq._id}
              href={`/manufacturer/rfqs/${rfq._id}`}
              className="block bg-white p-4 rounded shadow hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">
                    {rfq.customOrderId?.title || "Untitled RFQ"}
                  </h3>
                  {rfq.customOrderId?.quantity && (
                    <p className="text-gray-600">
                      Quantity: {rfq.customOrderId.quantity}
                    </p>
                  )}
                  {rfq.customOrderId?.budget && (
                    <p className="text-gray-600">
                      Budget: ${rfq.customOrderId.budget}
                    </p>
                  )}
                  {rfq.customOrderId?.materialPreferences &&
                    rfq.customOrderId.materialPreferences.length > 0 && (
                      <p className="text-sm text-gray-500">
                        Materials:{" "}
                        {rfq.customOrderId.materialPreferences.join(", ")}
                      </p>
                    )}
                  <p className="text-sm text-gray-500 mt-2">
                    Posted: {new Date(rfq.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      rfq.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100"
                    }`}
                  >
                    {rfq.status}
                  </span>
                  <p className="text-sm text-gray-600 mt-2">
                    {getTimeRemaining(rfq.endDate)}
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {rfq.bidsCount || 0} bids
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
