"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";

export default function ManufacturerRFQDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [rfq, setRfq] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "manufacturer") {
      fetchRFQ();
    }
  }, [status, session]);

  const fetchRFQ = async () => {
    try {
      const response = await fetch(`/api/rfqs/${params.id}`);
      const data = await response.json();

      if (data.success && data.rfq) {
        setRfq(data.rfq);
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

    return `${days}d ${hours}h`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (session?.user?.role !== "manufacturer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">
          Access Denied. Manufacturers only.
        </div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">RFQ not found</div>
      </div>
    );
  }

  const isActive = rfq.status === "active";
  const hasBid = !!myBid;

  return (
    <>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
      />

      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-3 flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link
                href="/manufacturer/dashboard"
                className="flex items-center gap-2"
              >
                <span className="text-3xl">🔧</span>
                <h2 className="text-xl font-bold text-blue-900">Craftit</h2>
              </Link>
              <button
                onClick={() => router.back()}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full hover:bg-gray-100">🔔</button>
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                {session.user.name?.charAt(0) || "M"}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-6xl">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <Link
              href="/manufacturer/rfqs"
              className="text-gray-500 hover:text-gray-700"
            >
              Auctions
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900 font-medium">
              {rfq.customOrderId?.title || "RFQ Details"}
            </span>
          </div>

          {/* Header with Image */}
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-start justify-between gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500">Project Overview</p>
              <h1 className="text-2xl font-bold text-blue-900 mt-1">
                {rfq.customOrderId?.title || "RFQ Details"}
              </h1>
              <p className="text-sm text-green-600 mt-1">
                {rfq.status === "active" ? "Auction Active" : "Auction Closed"}
              </p>
            </div>
            {rfq.customOrderId?.images?.[0]?.url && (
              <Image
                src={rfq.customOrderId.images[0].url}
                alt="Project"
                width={192}
                height={128}
                className="object-cover rounded-lg shadow-md shrink-0"
              />
            )}
          </div>

          {/* Time & Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Time Remaining</p>
              <p className="text-xl font-bold text-blue-800">
                {getTimeRemaining(rfq.endDate)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Bids</p>
              <p className="text-xl font-bold text-purple-800">
                {rfq.bidsCount || 0}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Minimum Bid</p>
              <p className="text-xl font-bold text-green-800">
                ${rfq.minBidThreshold || 0}
              </p>
            </div>
          </div>

          {/* My Bid Status */}
          {hasBid && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">
                    You have already placed a bid on this RFQ
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Bid Amount: ${myBid.amount} | Timeline: {myBid.timeline}{" "}
                    days
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
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
                <Link
                  href={`/bids/${myBid._id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  View/Update Bid
                </Link>
              </div>
            </div>
          )}

          {/* Project Details */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">
              Project Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-gray-700">
                  Description:
                </label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                  {rfq.customOrderId?.description || "No description"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700">
                    Quantity:
                  </label>
                  <p className="text-gray-900">
                    {rfq.customOrderId?.quantity || "N/A"}
                  </p>
                </div>
                {rfq.customOrderId?.budget && (
                  <div>
                    <label className="font-semibold text-gray-700">
                      Budget:
                    </label>
                    <p className="text-gray-900">${rfq.customOrderId.budget}</p>
                  </div>
                )}
              </div>

              {rfq.customOrderId?.materialPreferences &&
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

              {rfq.customOrderId?.colorSpecifications &&
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

              {rfq.customOrderId?.deadline && (
                <div>
                  <label className="font-semibold text-gray-700">
                    Deadline:
                  </label>
                  <p className="text-gray-900">
                    {new Date(rfq.customOrderId.deadline).toLocaleDateString()}
                  </p>
                </div>
              )}

              {rfq.customOrderId?.specialRequirements && (
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
            {rfq.customOrderId?.model3D?.url && (
              <div className="mt-6">
                <h3 className="font-bold text-gray-900 mb-2">3D Model</h3>
                <model-viewer
                  src={rfq.customOrderId.model3D.url}
                  alt="3D Model"
                  auto-rotate
                  camera-controls
                  className="w-full h-96 bg-gray-100 rounded-lg"
                />
              </div>
            )}

            {/* Images */}
            {rfq.customOrderId?.images &&
              rfq.customOrderId.images.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-gray-900 mb-2">Images</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {rfq.customOrderId.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-48 rounded-lg overflow-hidden"
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/manufacturer/rfqs")}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
            >
              Back to RFQs
            </button>

            {isActive && !hasBid && (
              <Link
                href={`/manufacturer/rfqs/${params.id}/bid`}
                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-center font-semibold"
              >
                Place Bid
              </Link>
            )}

            {hasBid && (
              <Link
                href={`/bids/${myBid._id}`}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center font-semibold"
              >
                View My Bid
              </Link>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 bg-white/50 py-6">
          <div className="container mx-auto px-4 text-center">
            <div className="flex justify-center gap-6 mb-4">
              <a
                href="#"
                className="text-gray-600 hover:text-orange-500 text-sm"
              >
                Help
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-orange-500 text-sm"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-orange-500 text-sm"
              >
                Support
              </a>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 Craftit. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
