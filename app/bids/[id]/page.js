"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function BidDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [bid, setBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [updateForm, setUpdateForm] = useState({
    amount: "",
    timeline: "",
    materialsDescription: "",
    processDescription: "",
    warrantyInfo: "",
    paymentTerms: "",
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchBid();
    }
  }, [status]);

  const fetchBid = async () => {
    try {
      const response = await fetch(`/api/bids/${params.id}`);
      const data = await response.json();

      if (data.success && data.bid) {
        setBid(data.bid);
        setUpdateForm({
          amount: data.bid.amount,
          timeline: data.bid.timeline,
          materialsDescription: data.bid.materialsDescription || "",
          processDescription: data.bid.processDescription || "",
          warrantyInfo: data.bid.warrantyInfo || "",
          paymentTerms: data.bid.paymentTerms || "",
        });
      } else {
        alert("Error loading bid: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error loading bid");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBid = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const response = await fetch(`/api/bids/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(updateForm.amount),
          timeline: Number(updateForm.timeline),
          materialsDescription: updateForm.materialsDescription,
          processDescription: updateForm.processDescription,
          warrantyInfo: updateForm.warrantyInfo,
          paymentTerms: updateForm.paymentTerms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Bid updated successfully!");
        setIsEditing(false);
        fetchBid();
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptBid = async () => {
    if (
      !confirm(
        "Are you sure you want to accept this bid? This will close the RFQ."
      )
    ) {
      return;
    }

    setAccepting(true);

    try {
      const response = await fetch(`/api/rfqs/${bid.rfqId._id}/accept-bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bidId: params.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Bid accepted! RFQ is now closed.");
        router.push(`/customer/rfqs/${bid.rfqId._id}`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setAccepting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!bid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Bid not found</div>
      </div>
    );
  }

  const isManufacturer = session.user.id === bid.manufacturerId._id;
  const isCustomer = session.user.id === bid.rfqId?.customerId;
  const canUpdate = isManufacturer && bid.status === "pending";
  const canAccept =
    isCustomer && bid.status !== "accepted" && bid.rfqId?.status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <Link
              href="/manufacturer/dashboard"
              className="flex items-center gap-2"
            >
              <span className="text-3xl">🔧</span>
              <span className="text-xl font-bold text-blue-900">Craftit</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Bid Details</h1>
            <p className="text-gray-600 mt-1">
              For: {bid.rfqId?.customOrderId?.title || "RFQ"}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              bid.status === "accepted"
                ? "bg-green-100 text-green-800"
                : bid.status === "under_consideration"
                ? "bg-yellow-100 text-yellow-800"
                : bid.status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {bid.status.toUpperCase().replace("_", " ")}
          </span>
        </div>

        {/* Manufacturer Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">
            Manufacturer Information
          </h2>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">
              {bid.manufacturerId.businessName || bid.manufacturerId.name}
            </p>
            {bid.manufacturerId.verificationStatus === "approved" && (
              <span className="text-green-600 text-xl" title="Verified">
                ✓
              </span>
            )}
          </div>
          <p className="text-gray-600">{bid.manufacturerId.email}</p>
          {bid.manufacturerId.stats && (
            <div className="mt-3 flex gap-6 text-sm">
              <div>
                <span className="text-gray-600">Rating: </span>
                <span className="font-semibold">
                  {bid.manufacturerId.stats.averageRating || 0}/5
                </span>
              </div>
              <div>
                <span className="text-gray-600">Completed Orders: </span>
                <span className="font-semibold">
                  {bid.manufacturerId.stats.completedOrders || 0}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bid Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-900">Bid Details</h2>
            {canUpdate && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600"
              >
                Edit Bid
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateBid} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-2">
                    Bid Amount ($) *
                  </label>
                  <input
                    type="number"
                    value={updateForm.amount}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, amount: e.target.value })
                    }
                    className="w-full border border-gray-300 p-2 rounded-lg"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-2">
                    Timeline (Days) *
                  </label>
                  <input
                    type="number"
                    value={updateForm.timeline}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, timeline: e.target.value })
                    }
                    className="w-full border border-gray-300 p-2 rounded-lg"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Materials Description
                </label>
                <textarea
                  value={updateForm.materialsDescription}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      materialsDescription: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 p-2 rounded-lg h-20"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Process Description
                </label>
                <textarea
                  value={updateForm.processDescription}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      processDescription: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 p-2 rounded-lg h-20"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:bg-orange-300"
                >
                  {updating ? "Updating..." : "Update Bid"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-gray-600">Bid Amount</label>
                  <p className="text-3xl font-bold text-orange-600">
                    ${bid.amount}
                  </p>
                </div>
                <div>
                  <label className="text-gray-600">Timeline</label>
                  <p className="text-2xl font-bold">{bid.timeline} days</p>
                </div>
              </div>

              {bid.materialsDescription && (
                <div className="mb-4">
                  <h3 className="font-bold mb-2">Materials</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {bid.materialsDescription}
                  </p>
                </div>
              )}

              {bid.processDescription && (
                <div className="mb-4">
                  <h3 className="font-bold mb-2">Manufacturing Process</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {bid.processDescription}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-900">
              Chat with {isManufacturer ? "Customer" : "Manufacturer"}
            </h2>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              {chatOpen ? "Close Chat" : "Open Chat"}
            </button>
          </div>

          {chatOpen && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-gray-600 text-center py-8">
                Chat functionality coming soon. For now, please use email for
                communication.
              </p>
              <p className="text-sm text-gray-500 text-center">
                {isManufacturer
                  ? `Customer email: ${bid.rfqId?.customerId?.email || "N/A"}`
                  : `Manufacturer email: ${bid.manufacturerId.email}`}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600"
          >
            Back
          </button>

          {canAccept && (
            <button
              onClick={handleAcceptBid}
              disabled={accepting}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-300"
            >
              {accepting ? "Accepting..." : "Accept Bid"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
