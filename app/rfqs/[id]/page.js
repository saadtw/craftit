"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Script from "next/script";

export default function RFQDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRFQ();
    }
  }, [status]);

  const fetchRFQ = async () => {
    try {
      const response = await fetch(`/api/rfqs/${params.id}`, {});
      const data = await response.json();

      if (data.success && data.rfq) {
        setRfq(data.rfq);
        if (data.bids) {
          setBids(data.bids);
        }
      } else {
        alert("Error loading RFQ: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error loading RFQ");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) return <div>Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!rfq) return <div>RFQ not found</div>;

  const isCustomer = session?.user?.id === rfq.customerId._id;
  const isManufacturer = session?.user?.role === "manufacturer";

  return (
    <>
      {/* Load model-viewer library for 3D models */}
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
      />

      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">
          {rfq.customOrderId?.title || "RFQ Details"}
        </h1>

        {/* Status Badge */}
        <span
          className={`px-4 py-2 rounded ${
            rfq.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100"
          }`}
        >
          {rfq.status.toUpperCase()}
        </span>

        {/* Time Remaining */}
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="font-semibold">
            Ends: {new Date(rfq.endDate).toLocaleString()}
          </p>
          {rfq.minBidThreshold && (
            <p className="text-sm text-gray-600 mt-1">
              Minimum Bid: ${rfq.minBidThreshold}
            </p>
          )}
        </div>

        {/* Custom Order Details */}
        {rfq.customOrderId && (
          <div className="mt-6 bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Project Details</h2>
            <p className="mb-2">
              <strong>Description:</strong> {rfq.customOrderId.description}
            </p>
            <p className="mb-2">
              <strong>Quantity:</strong> {rfq.customOrderId.quantity}
            </p>
            {rfq.customOrderId.materialPreferences &&
              rfq.customOrderId.materialPreferences.length > 0 && (
                <p className="mb-2">
                  <strong>Materials:</strong>{" "}
                  {rfq.customOrderId.materialPreferences.join(", ")}
                </p>
              )}
            {rfq.customOrderId.colorSpecifications &&
              rfq.customOrderId.colorSpecifications.length > 0 && (
                <p className="mb-2">
                  <strong>Colors:</strong>{" "}
                  {rfq.customOrderId.colorSpecifications.join(", ")}
                </p>
              )}
            {rfq.customOrderId.deadline && (
              <p className="mb-2">
                <strong>Deadline:</strong>{" "}
                {new Date(rfq.customOrderId.deadline).toLocaleDateString()}
              </p>
            )}
            {rfq.customOrderId.budget && (
              <p className="mb-2">
                <strong>Budget:</strong> ${rfq.customOrderId.budget}
              </p>
            )}
            {rfq.customOrderId.specialRequirements && (
              <p className="mb-2">
                <strong>Special Requirements:</strong>{" "}
                {rfq.customOrderId.specialRequirements}
              </p>
            )}

            {/* 3D Model Viewer */}
            {rfq.customOrderId.model3D && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">3D Model</h3>
                <model-viewer
                  src={rfq.customOrderId.model3D.url}
                  alt="3D Model"
                  auto-rotate
                  camera-controls
                  style={{ width: "100%", height: "500px" }}
                />
              </div>
            )}

            {/* Images */}
            {rfq.customOrderId.images &&
              rfq.customOrderId.images.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold mb-2">Images</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {rfq.customOrderId.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img.url}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-48 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6">
          {isManufacturer && rfq.status === "active" && (
            <button
              onClick={() => router.push(`/manufacturer/rfqs/${params.id}/bid`)}
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Place Bid
            </button>
          )}

          {isCustomer && (
            <div className="mt-4">
              <h2 className="text-2xl font-bold mb-4">
                Bids Received ({bids.length})
              </h2>
              {bids.length === 0 ? (
                <p>No bids yet</p>
              ) : (
                <div className="grid gap-4">
                  {bids.map((bid) => (
                    <div key={bid._id} className="bg-white p-4 rounded shadow">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-bold">
                            {bid.manufacturerId.businessName}
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            ${bid.amount}
                          </p>
                          <p className="text-gray-600">
                            Timeline: {bid.timeline} days
                          </p>
                          <p className="text-sm text-gray-500">
                            Status: {bid.status}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            router.push(`/customer/bids/${bid._id}`)
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
