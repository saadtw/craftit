"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function CreateRFQ() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [customOrder, setCustomOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    duration: 168, // 7 days in hours
    minBidThreshold: "",
    broadcastToAll: true,
  });

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
      fetchCustomOrder();
    }
  }, [status, session, router]);

  const fetchCustomOrder = async () => {
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`, {});
      const data = await response.json();

      if (data.success && data.order) {
        // Check if RFQ already exists
        if (data.order.rfqId) {
          alert(
            "RFQ already created for this order. Redirecting to RFQ details...",
          );
          router.push(
            `/customer/rfqs/${data.order.rfqId._id || data.order.rfqId}`,
          );
          return;
        }
        setCustomOrder(data.order);
      } else {
        alert("Error loading order: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error loading order: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/rfqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customOrderId: params.id,
          duration: Number(formData.duration),
          minBidThreshold: formData.minBidThreshold
            ? Number(formData.minBidThreshold)
            : undefined,
          broadcastToAll: formData.broadcastToAll,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("RFQ created successfully!");
        router.push(`/customer/rfqs/${data.rfq._id}`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) return <div>Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!customOrder) return <div>Order not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold">Create RFQ (Auction)</h1>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-bold mb-2">Order Details:</h2>
        <p>
          <strong>Title:</strong> {customOrder.title}
        </p>
        <p>
          <strong>Quantity:</strong> {customOrder.quantity}
        </p>
        <p>
          <strong>Budget:</strong> ${customOrder.budget || "Not specified"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Duration (hours) *</label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: e.target.value })
            }
            min="24"
            className="w-full border p-2 rounded"
            required
          />
          <p className="text-sm text-gray-600 mt-1">
            {Math.floor(formData.duration / 24)} days
          </p>
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-semibold">
            Minimum Bid Threshold ($)
          </label>
          <input
            type="number"
            value={formData.minBidThreshold}
            onChange={(e) =>
              setFormData({ ...formData, minBidThreshold: e.target.value })
            }
            className="w-full border p-2 rounded"
            placeholder="Optional"
            min="0"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.broadcastToAll}
              onChange={(e) =>
                setFormData({ ...formData, broadcastToAll: e.target.checked })
              }
            />
            <span className="font-semibold">
              Broadcast to all manufacturers
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Creating..." : "Create RFQ"}
        </button>
      </form>
    </div>
  );
}
