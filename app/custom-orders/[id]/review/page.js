// app/custom-orders/[id]/review/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Script from "next/script";
import Image from "next/image";

export default function CustomOrderReview() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [customOrder, setCustomOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`);
      const data = await response.json();

      if (data.success && data.order) {
        setCustomOrder(data.order);
      } else {
        alert("Error loading order: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error loading order: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

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
  }, [status, session, router, fetchCustomOrder]);

  const handleEdit = () => {
    router.push(`/custom-orders/${params.id}/edit`);
  };

  const handleCreateRFQ = () => {
    router.push(`/custom-orders/${params.id}/create-rfq`);
  };

  const handleViewRFQ = () => {
    if (customOrder.rfqId) {
      router.push(
        `/customer/rfqs/${customOrder.rfqId._id || customOrder.rfqId}`,
      );
    }
  };

  const handleSaveAsDraft = async () => {
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "draft" }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Saved as draft!");
        router.push("/customer/custom-orders");
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/customer/dashboard");
  };

  const handleBackToList = () => {
    router.push("/customer/custom-orders");
  };

  if (status === "loading" || loading)
    return <div className="p-6">Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!customOrder) return <div className="p-6">Order not found</div>;

  return (
    <>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
      />

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Review Custom Order</h1>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
          <p className="text-sm text-yellow-800">
            Please review your custom order details carefully before proceeding.
            These details cannot be edited after creating an RFQ.
          </p>
        </div>

        {/* Order Details - Read Only */}
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Order Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Title
              </label>
              <p className="text-gray-900">{customOrder.title}</p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Description
              </label>
              <p className="text-gray-900 whitespace-pre-wrap">
                {customOrder.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Quantity
                </label>
                <p className="text-gray-900">{customOrder.quantity}</p>
              </div>

              {customOrder.budget && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Budget
                  </label>
                  <p className="text-gray-900">${customOrder.budget}</p>
                </div>
              )}
            </div>

            {customOrder.materialPreferences &&
              customOrder.materialPreferences.length > 0 && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Material Preferences
                  </label>
                  <p className="text-gray-900">
                    {customOrder.materialPreferences.join(", ")}
                  </p>
                </div>
              )}

            {customOrder.colorSpecifications &&
              customOrder.colorSpecifications.length > 0 && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Color Specifications
                  </label>
                  <p className="text-gray-900">
                    {customOrder.colorSpecifications.join(", ")}
                  </p>
                </div>
              )}

            {customOrder.deadline && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Deadline
                </label>
                <p className="text-gray-900">
                  {new Date(customOrder.deadline).toLocaleDateString()}
                </p>
              </div>
            )}

            {customOrder.specialRequirements && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Special Requirements
                </label>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {customOrder.specialRequirements}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3D Model */}
        {customOrder.model3D && (
          <div className="bg-white p-6 rounded shadow mb-6">
            <h2 className="text-xl font-bold mb-4">3D Model</h2>
            <model-viewer
              src={customOrder.model3D.url}
              alt="3D Model"
              auto-rotate
              camera-controls
              className="w-full h-96 bg-gray-100 rounded"
            />
            <p className="text-sm text-gray-600 mt-2">
              File: {customOrder.model3D.filename}
            </p>
          </div>
        )}

        {/* Images */}
        {customOrder.images && customOrder.images.length > 0 && (
          <div className="bg-white p-6 rounded shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Images</h2>
            <div className="grid grid-cols-3 gap-4">
              {customOrder.images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative h-48 rounded overflow-hidden"
                >
                  <Image
                    src={img.url}
                    alt={`Image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Primary Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleEdit}
              className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Edit Order
            </button>

            {customOrder.rfqId ? (
              <button
                onClick={handleViewRFQ}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
              >
                View RFQ Details
              </button>
            ) : (
              <>
                <button
                  onClick={handleCreateRFQ}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create RFQ (Auction)
                </button>

                <button
                  disabled
                  className="px-6 py-3 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                  title="Coming soon"
                >
                  Find Suitable Manufacturer
                </button>
              </>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleBackToDashboard}
              className="flex-1 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleBackToList}
              className="flex-1 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              View All Custom Orders
            </button>
            {customOrder.status === "submitted" && (
              <button
                onClick={handleSaveAsDraft}
                className="flex-1 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Revert to Draft
              </button>
            )}
          </div>
        </div>

        {!customOrder.rfqId && (
          <p className="text-sm text-gray-600 mt-4">
            Note: &quot;Find Suitable Manufacturer&quot; feature is not
            available in this version.
          </p>
        )}
      </div>
    </>
  );
}
