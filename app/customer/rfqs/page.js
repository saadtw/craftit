"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CustomerRFQsListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchRFQs = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/rfqs" : `/api/rfqs?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRfqs(data.rfqs || []);
      }
    } catch (error) {
      console.error("Error fetching RFQs:", error);
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
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchRFQs();
    }
  }, [status, session, router, fetchRFQs]);

  if (status === "loading" || loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My RFQs (Requests for Quote)
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your quotes and view manufacturer bids
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/customer/dashboard">
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Back to Dashboard
                </button>
              </Link>
              <Link href="/custom-orders/new">
                <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  + Create Custom Order
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            {["all", "active", "pending", "closed", "cancelled"].map(
              (statusFilter) => (
                <button
                  key={statusFilter}
                  onClick={() => setFilter(statusFilter)}
                  className={`pb-3 px-2 text-sm font-medium capitalize transition-colors ${
                    filter === statusFilter
                      ? "border-b-2 border-amber-600 text-amber-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {statusFilter}
                </button>
              ),
            )}
          </div>
        </div>

        {/* RFQs List */}
        {rfqs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-4">
              <span className="material-symbols-outlined text-6xl">
                request_quote
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No RFQs yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create a custom order first, then convert it to an RFQ to receive
              bids from manufacturers
            </p>
            <Link href="/custom-orders/new">
              <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                Create Custom Order
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rfqs.map((rfq) => (
              <div
                key={rfq._id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {rfq.customOrderId?.title || "RFQ"}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          rfq.status,
                        )}`}
                      >
                        {rfq.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {rfq.customOrderId?.description || "No description"}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Bids: {rfq.bidsCount || 0}</span>
                      {rfq.endDate && rfq.status === "active" && (
                        <span className="text-orange-600 font-medium">
                          {getTimeRemaining(rfq.endDate)}
                        </span>
                      )}
                      <span>
                        Created: {new Date(rfq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Link href={`/customer/rfqs/${rfq._id}`}>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        View Details
                      </button>
                    </Link>
                    {rfq.bidsCount > 0 && (
                      <Link href={`/customer/rfqs/${rfq._id}/bids`}>
                        <button className="px-4 py-2 border border-amber-600 text-amber-600 text-sm rounded-lg hover:bg-amber-50 whitespace-nowrap">
                          View Bids ({rfq.bidsCount})
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
