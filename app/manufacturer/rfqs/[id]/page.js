"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Script from "next/script";

export default function ManufacturerRFQDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [rfq, setRfq] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRFQ();
    }
  }, [status]);

  const fetchRFQ = async () => {
    try {
      const response = await fetch(`/api/rfqs/${params.id}`);
      const data = await response.json();

      if (data.success && data.rfq) {
        setRfq(data.rfq);
        // Check if manufacturer already bid
        if (data.bids && data.bids.length > 0) {
          setMyBid(data.bids[0]);
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

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `${days}d ${hours}h remaining`;
  };

  if (status === "loading" || loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!rfq) {
    return <div className="p-6">RFQ not found</div>;
  }

  const isActive = rfq.status === "active";
  const hasBid = !!myBid;

  return (
    <>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
      />

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {rfq.customOrderId?.title || "RFQ Details"}
            </h1>
            <p className="text-gray-600 mt-1">RFQ #{rfq.rfqNumber}</p>
          </div>

          <span
            className={`px-4 py-2 rounded text-sm font-semibold ${
              rfq.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {rfq.status.toUpperCase().replace("_", " ")}
          </span>
        </div>

        {/* Time & Stats Card */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600">Time Remaining</p>
            <p className="text-xl font-bold text-blue-800">
              {getTimeRemaining(rfq.endDate)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-600">Total Bids</p>
            <p className="text-xl font-bold text-purple-800">
              {rfq.bidsCount || 0}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-gray-600">Minimum Bid</p>
            <p className="text-xl font-bold text-green-800">
              ${rfq.minBidThreshold || 0}
            </p>
          </div>
        </div>

        {/* My Bid Status */}
        {hasBid && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  You have already placed a bid on this RFQ
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Bid Amount: ${myBid.amount} | Timeline: {myBid.timeline} days
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded text-xs font-semibold ${
                    myBid.status === "accepted"
                      ? "bg-green-100 text-green-800"
                      : myBid.status === "under_consideration"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {myBid.status.toUpperCase().replace("_", " ")}
                </span>
              </div>
              <button
                onClick={() => router.push(`/bids/${myBid._id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View/Update Bid
              </button>
            </div>
          </div>
        )}

        {/* Custom Order Details */}
        {rfq.customOrderId && (
          <div className="bg-white p-6 rounded shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Project Details</h2>
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-gray-700">
                  Description:
                </label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                  {rfq.customOrderId.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">
                    Quantity:
                  </label>
                  <p className="text-gray-900">{rfq.customOrderId.quantity}</p>
                </div>
                {rfq.customOrderId.budget && (
                  <div>
                    <label className="font-semibold text-gray-700">
                      Budget:
                    </label>
                    <p className="text-gray-900">${rfq.customOrderId.budget}</p>
                  </div>
                )}
              </div>

              {rfq.customOrderId.materialPreferences &&
                rfq.customOrderId.materialPreferences.length > 0 && (
                  <div>
                    <label className="font-semibold text-gray-700">
                      Material Preferences:
                    </label>
                    <p className="text-gray-900">
                      {rfq.customOrderId.materialPreferences.join(", ")}
                    </p>
                  </div>
                )}

              {rfq.customOrderId.colorSpecifications &&
                rfq.customOrderId.colorSpecifications.length > 0 && (
                  <div>
                    <label className="font-semibold text-gray-700">
                      Color Specifications:
                    </label>
                    <p className="text-gray-900">
                      {rfq.customOrderId.colorSpecifications.join(", ")}
                    </p>
                  </div>
                )}

              {rfq.customOrderId.deadline && (
                <div>
                  <label className="font-semibold text-gray-700">
                    Deadline:
                  </label>
                  <p className="text-gray-900">
                    {new Date(rfq.customOrderId.deadline).toLocaleDateString()}
                  </p>
                </div>
              )}

              {rfq.customOrderId.specialRequirements && (
                <div>
                  <label className="font-semibold text-gray-700">
                    Special Requirements:
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {rfq.customOrderId.specialRequirements}
                  </p>
                </div>
              )}
            </div>

            {/* 3D Model Viewer */}
            {rfq.customOrderId.model3D && (
              <div className="mt-6">
                <h3 className="font-bold mb-2">3D Model</h3>
                <model-viewer
                  src={rfq.customOrderId.model3D.url}
                  alt="3D Model"
                  auto-rotate
                  camera-controls
                  className="w-full h-96 bg-gray-100 rounded"
                />
              </div>
            )}

            {/* Images */}
            {rfq.customOrderId.images &&
              rfq.customOrderId.images.length > 0 && (
                <div className="mt-6">
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
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/manufacturer/rfqs")}
            className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to RFQs
          </button>

          {isActive && !hasBid && (
            <button
              onClick={() => router.push(`/manufacturer/rfqs/${params.id}/bid`)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Place Bid
            </button>
          )}

          {hasBid && (
            <button
              onClick={() => router.push(`/bids/${myBid._id}`)}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              View My Bid
            </button>
          )}
        </div>
      </div>
    </>
  );
}
