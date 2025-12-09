"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function PlaceBidPage({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [rfq, setRfq] = useState(null);
  const [formData, setFormData] = useState({
    rfqId: unwrappedParams.id,
    amount: "",
    timeline: "",
    costBreakdown: {
      materials: "",
      labor: "",
      overhead: "",
      profit: "",
    },
    processDescription: "",
    materialsDescription: "",
    paymentTerms: "",
    warrantyInfo: "",
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchRFQ();
    }
  }, [status]);

  const fetchRFQ = async () => {
    try {
      const res = await fetch(`/api/rfqs/${unwrappedParams.id}`);
      const data = await res.json();

      if (res.ok && data.rfq) {
        setRfq(data.rfq);
      } else {
        alert("Failed to load RFQ details");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        rfqId: formData.rfqId,
        amount: Number(formData.amount),
        timeline: Number(formData.timeline),
        costBreakdown: {
          materials: Number(formData.costBreakdown.materials) || 0,
          labor: Number(formData.costBreakdown.labor) || 0,
          overhead: Number(formData.costBreakdown.overhead) || 0,
          profit: Number(formData.costBreakdown.profit) || 0,
        },
        processDescription: formData.processDescription,
        materialsDescription: formData.materialsDescription,
        paymentTerms: formData.paymentTerms,
        warrantyInfo: formData.warrantyInfo,
      };

      const res = await fetch("/api/bids", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert("Bid placed successfully!");
      router.push("/manufacturer/bids");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !rfq)
    return <div className="p-6">Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Place Bid</h1>

      {rfq && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4">RFQ Details</h2>
          <div className="space-y-2">
            <p>
              <strong>Project:</strong> {rfq.customOrderId?.title}
            </p>
            <p>
              <strong>Quantity:</strong> {rfq.customOrderId?.quantity}
            </p>
            <p>
              <strong>Budget:</strong> $
              {rfq.customOrderId?.budget || "Not specified"}
            </p>
            <p>
              <strong>Deadline:</strong>{" "}
              {rfq.customOrderId?.deadline
                ? new Date(rfq.customOrderId.deadline).toLocaleDateString()
                : "Not specified"}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-semibold mb-2">Bid Amount ($) *</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            required
            min="0"
            step="0.01"
            className="w-full p-3 border rounded"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Timeline (Days) *</label>
          <input
            type="number"
            value={formData.timeline}
            onChange={(e) =>
              setFormData({ ...formData, timeline: e.target.value })
            }
            required
            min="1"
            className="w-full p-3 border rounded"
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-xl font-bold mb-4">Cost Breakdown (Optional)</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-2">
                Materials Cost ($)
              </label>
              <input
                type="number"
                value={formData.costBreakdown.materials}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costBreakdown: {
                      ...formData.costBreakdown,
                      materials: e.target.value,
                    },
                  })
                }
                min="0"
                step="0.01"
                className="w-full p-3 border rounded"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Labor Cost ($)</label>
              <input
                type="number"
                value={formData.costBreakdown.labor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costBreakdown: {
                      ...formData.costBreakdown,
                      labor: e.target.value,
                    },
                  })
                }
                min="0"
                step="0.01"
                className="w-full p-3 border rounded"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Overhead Cost ($)
              </label>
              <input
                type="number"
                value={formData.costBreakdown.overhead}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costBreakdown: {
                      ...formData.costBreakdown,
                      overhead: e.target.value,
                    },
                  })
                }
                min="0"
                step="0.01"
                className="w-full p-3 border rounded"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Profit Margin ($)
              </label>
              <input
                type="number"
                value={formData.costBreakdown.profit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costBreakdown: {
                      ...formData.costBreakdown,
                      profit: e.target.value,
                    },
                  })
                }
                min="0"
                step="0.01"
                className="w-full p-3 border rounded"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Materials Description
          </label>
          <textarea
            value={formData.materialsDescription}
            onChange={(e) =>
              setFormData({ ...formData, materialsDescription: e.target.value })
            }
            placeholder="Describe the materials you will use..."
            rows={3}
            className="w-full p-3 border rounded"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Process Description
          </label>
          <textarea
            value={formData.processDescription}
            onChange={(e) =>
              setFormData({ ...formData, processDescription: e.target.value })
            }
            placeholder="Describe your manufacturing process..."
            rows={4}
            className="w-full p-3 border rounded"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Payment Terms</label>
          <textarea
            value={formData.paymentTerms}
            onChange={(e) =>
              setFormData({ ...formData, paymentTerms: e.target.value })
            }
            placeholder="e.g., 50% upfront, 50% on completion"
            rows={3}
            className="w-full p-3 border rounded"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Warranty Information
          </label>
          <textarea
            value={formData.warrantyInfo}
            onChange={(e) =>
              setFormData({ ...formData, warrantyInfo: e.target.value })
            }
            placeholder="Warranty terms and conditions..."
            rows={3}
            className="w-full p-3 border rounded"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Bid"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
