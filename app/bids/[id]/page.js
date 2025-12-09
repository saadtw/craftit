"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function BidDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [bid, setBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Update form for manufacturer
  const [updateForm, setUpdateForm] = useState({
    amount: "",
    timeline: "",
    materialsDescription: "",
    processDescription: "",
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
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Bid updated successfully!");
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
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!bid) {
    return <div className="p-6">Bid not found</div>;
  }

  const isManufacturer = session.user.id === bid.manufacturerId._id;
  const isCustomer = session.user.id === bid.rfqId?.customerId;
  const canUpdate = isManufacturer && bid.status === "pending";
  const canAccept =
    isCustomer && bid.status !== "accepted" && bid.rfqId?.status === "active";

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bid Details</h1>
          <p className="text-gray-600 mt-1">
            For: {bid.rfqId?.customOrderId?.title || "RFQ"}
          </p>
        </div>
        <span
          className={`px-4 py-2 rounded text-sm font-semibold ${
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
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Manufacturer Information</h2>
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
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Bid Details</h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-gray-600">Bid Amount</label>
            <p className="text-3xl font-bold text-blue-600">${bid.amount}</p>
          </div>
          <div>
            <label className="text-gray-600">Timeline</label>
            <p className="text-2xl font-bold">{bid.timeline} days</p>
          </div>
        </div>

        {bid.costBreakdown && (
          <div className="mb-6">
            <h3 className="font-bold mb-2">Cost Breakdown</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {bid.costBreakdown.materials > 0 && (
                <div>
                  <span className="text-gray-600">Materials: </span>
                  <span className="font-semibold">
                    ${bid.costBreakdown.materials}
                  </span>
                </div>
              )}
              {bid.costBreakdown.labor > 0 && (
                <div>
                  <span className="text-gray-600">Labor: </span>
                  <span className="font-semibold">
                    ${bid.costBreakdown.labor}
                  </span>
                </div>
              )}
              {bid.costBreakdown.overhead > 0 && (
                <div>
                  <span className="text-gray-600">Overhead: </span>
                  <span className="font-semibold">
                    ${bid.costBreakdown.overhead}
                  </span>
                </div>
              )}
              {bid.costBreakdown.profit > 0 && (
                <div>
                  <span className="text-gray-600">Profit: </span>
                  <span className="font-semibold">
                    ${bid.costBreakdown.profit}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

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

        {bid.paymentTerms && (
          <div className="mb-4">
            <h3 className="font-bold mb-2">Payment Terms</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {bid.paymentTerms}
            </p>
          </div>
        )}

        {bid.warrantyInfo && (
          <div className="mb-4">
            <h3 className="font-bold mb-2">Warranty Information</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {bid.warrantyInfo}
            </p>
          </div>
        )}

        {bid.proposedMilestones && bid.proposedMilestones.length > 0 && (
          <div>
            <h3 className="font-bold mb-2">Proposed Milestones</h3>
            <div className="space-y-2">
              {bid.proposedMilestones.map((milestone, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-3">
                  <p className="font-semibold">{milestone.name}</p>
                  <p className="text-sm text-gray-600">
                    {milestone.duration} days
                  </p>
                  {milestone.description && (
                    <p className="text-sm text-gray-700">
                      {milestone.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Update Bid Form (Manufacturer Only) */}
      {canUpdate && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Update Your Bid</h2>
          <form onSubmit={handleUpdateBid}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 font-semibold">
                  Bid Amount ($) *
                </label>
                <input
                  type="number"
                  value={updateForm.amount}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, amount: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold">
                  Timeline (Days) *
                </label>
                <input
                  type="number"
                  value={updateForm.timeline}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, timeline: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-semibold">
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
                className="w-full border p-2 rounded h-20"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-semibold">
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
                className="w-full border p-2 rounded h-20"
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {updating ? "Updating..." : "Update Bid"}
            </button>
          </form>
        </div>
      )}

      {/* Chat Section */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Chat with {isManufacturer ? "Customer" : "Manufacturer"}
          </h2>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {chatOpen ? "Close Chat" : "Open Chat"}
          </button>
        </div>

        {chatOpen && (
          <div className="border rounded p-4 bg-gray-50">
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
          className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Back
        </button>

        {canAccept && (
          <button
            onClick={handleAcceptBid}
            disabled={accepting}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
          >
            {accepting ? "Accepting..." : "Accept Bid"}
          </button>
        )}
      </div>
    </div>
  );
}
