// app/customer/rfqs/[id]/bids/page.js
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const MAX_COMPARE_BIDS = 3;

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getScoreBand(score) {
  if (score >= 85) {
    return {
      label: "Strong Match",
      className: "text-green-700",
    };
  }

  if (score >= 70) {
    return {
      label: "Good Match",
      className: "text-blue-700",
    };
  }

  return {
    label: "Needs Review",
    className: "text-amber-700",
  };
}

function getBidHighlights(bid, benchmarks) {
  const highlights = [];
  const amount = Number(bid?.amount || 0);
  const timeline = Number(bid?.timeline || 0);
  const rating = Number(bid?.manufacturerId?.stats?.averageRating || 0);
  const isVerified = bid?.manufacturerId?.verificationStatus === "verified";

  if (benchmarks && amount === benchmarks.lowestAmount) {
    highlights.push("Best price");
  }

  if (benchmarks && timeline === benchmarks.shortestTimeline) {
    highlights.push("Fastest delivery");
  }

  if (isVerified) {
    highlights.push("Verified manufacturer");
  }

  if (benchmarks && rating > 0 && rating === benchmarks.highestRating) {
    highlights.push("Top rated");
  }

  if ((bid?.ranking?.overallScore || 0) >= 85) {
    highlights.push("Strong overall fit");
  }

  if (highlights.length === 0) {
    highlights.push("Balanced offer");
  }

  return highlights.slice(0, 3);
}

export default function BidComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [bids, setBids] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBidIds, setSelectedBidIds] = useState([]);

  const fetchBids = useCallback(async () => {
    try {
      const res = await fetch(`/api/rfqs/${params.id}/bids`);
      const data = await res.json();

      if (res.ok) {
        setBids(data.bids || []);
        setAnalysis(data.analysis);
      } else {
        alert(data.error || "Failed to fetch bids");
      }
    } catch (error) {
      alert(error.message);
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
      fetchBids();
    }
  }, [status, session, router, fetchBids]);

  useEffect(() => {
    if (bids.length === 0) {
      setSelectedBidIds([]);
      return;
    }

    setSelectedBidIds((prev) => {
      const valid = prev.filter((id) => bids.some((bid) => bid._id === id));
      if (valid.length >= 2 || bids.length < 2) {
        return valid;
      }

      const fallback = bids
        .slice(0, Math.min(2, bids.length))
        .map((bid) => bid._id);
      return fallback;
    });
  }, [bids]);

  const selectedBids = useMemo(
    () => bids.filter((bid) => selectedBidIds.includes(bid._id)),
    [bids, selectedBidIds],
  );

  const allBidBenchmarks = useMemo(() => {
    if (bids.length === 0) {
      return null;
    }

    return {
      lowestAmount: Math.min(...bids.map((bid) => bid.amount || 0)),
      shortestTimeline: Math.min(
        ...bids.map((bid) => bid.timeline || Infinity),
      ),
      highestRating: Math.max(
        ...bids.map((bid) => bid.manufacturerId?.stats?.averageRating || 0),
      ),
    };
  }, [bids]);

  const matrixBenchmarks = useMemo(() => {
    if (selectedBids.length === 0) {
      return null;
    }

    return {
      lowestAmount: Math.min(...selectedBids.map((bid) => bid.amount || 0)),
      shortestTimeline: Math.min(
        ...selectedBids.map((bid) => bid.timeline || Infinity),
      ),
      highestScore: Math.max(
        ...selectedBids.map((bid) => bid.ranking?.overallScore || 0),
      ),
      highestRating: Math.max(
        ...selectedBids.map(
          (bid) => bid.manufacturerId?.stats?.averageRating || 0,
        ),
      ),
    };
  }, [selectedBids]);

  const handleToggleCompare = (bidId) => {
    setSelectedBidIds((prev) => {
      if (prev.includes(bidId)) {
        return prev.filter((id) => id !== bidId);
      }

      if (prev.length >= MAX_COMPARE_BIDS) {
        alert(`You can compare up to ${MAX_COMPARE_BIDS} bids at once.`);
        return prev;
      }

      return [...prev, bidId];
    });
  };

  if (status === "loading" || loading) return <div>Loading bids...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  const topBidsForExplainability = bids.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Bid Comparison</h1>
        <button
          onClick={() => router.push(`/customer/rfqs/${params.id}`)}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
        >
          Back to RFQ
        </button>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border rounded p-4">
            <p className="text-xs uppercase text-gray-500">Total Bids</p>
            <p className="text-2xl font-semibold">{analysis.totalBids}</p>
          </div>
          <div className="bg-white border rounded p-4">
            <p className="text-xs uppercase text-gray-500">Price Range</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(analysis.priceRange.min)} -{" "}
              {formatCurrency(analysis.priceRange.max)}
            </p>
            <p className="text-sm text-gray-600">
              Avg: {formatCurrency(analysis.priceRange.average)}
            </p>
          </div>
          <div className="bg-white border rounded p-4">
            <p className="text-xs uppercase text-gray-500">Timeline Range</p>
            <p className="text-2xl font-semibold">
              {analysis.timelineRange.min} - {analysis.timelineRange.max} days
            </p>
            <p className="text-sm text-gray-600">
              Avg: {analysis.timelineRange.average.toFixed(1)} days
            </p>
          </div>
          <div className="bg-white border rounded p-4">
            <p className="text-xs uppercase text-gray-500">Verified Makers</p>
            <p className="text-2xl font-semibold">
              {analysis.verifiedManufacturers}
            </p>
          </div>
        </div>
      )}

      {bids.length === 0 ? (
        <div className="bg-white border rounded p-8 text-center text-gray-600">
          No bids received yet
        </div>
      ) : (
        <>
          <section className="bg-white border rounded p-5">
            <h2 className="text-xl font-semibold mb-2">
              How Recommendations Are Generated
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Recommendations combine price competitiveness, delivery timeline,
              manufacturer verification, and reliability signals to help you
              shortlist bids faster.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {topBidsForExplainability.map((bid, index) => {
                const score = bid.ranking?.overallScore || 0;
                const scoreBand = getScoreBand(score);
                const highlights = getBidHighlights(bid, allBidBenchmarks);

                return (
                  <div key={bid._id} className="border rounded p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold">
                        #{index + 1} {bid.manufacturerId?.businessName}
                      </p>
                      <p
                        className={`text-sm font-semibold ${scoreBand.className}`}
                      >
                        {scoreBand.label}
                      </p>
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      <p>Bid: {formatCurrency(bid.amount)}</p>
                      <p>Timeline: {bid.timeline} days</p>
                      <p>
                        Rating:{" "}
                        {(
                          bid.manufacturerId?.stats?.averageRating || 0
                        ).toFixed(1)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {highlights.map((highlight) => (
                        <span
                          key={`${bid._id}-${highlight}`}
                          className="px-2 py-1 text-xs rounded-full bg-white border text-gray-700"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white border rounded p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3 gap-3">
              <h2 className="text-xl font-semibold">All Bids</h2>
              <p className="text-sm text-gray-600">
                Select up to {MAX_COMPARE_BIDS} bids for side-by-side matrix.
              </p>
            </div>

            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-3">Compare</th>
                  <th className="text-left py-3 pr-3">Rank</th>
                  <th className="text-left py-3 pr-3">Manufacturer</th>
                  <th className="text-left py-3 pr-3">Amount</th>
                  <th className="text-left py-3 pr-3">Timeline</th>
                  <th className="text-left py-3 pr-3">Recommendation</th>
                  <th className="text-left py-3 pr-3">Status</th>
                  <th className="text-left py-3 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid, index) => {
                  const score = bid.ranking?.overallScore || 0;
                  const scoreBand = getScoreBand(score);

                  return (
                    <tr key={bid._id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={selectedBidIds.includes(bid._id)}
                          onChange={() => handleToggleCompare(bid._id)}
                          aria-label={`Select ${bid.manufacturerId?.businessName} for comparison`}
                        />
                      </td>
                      <td className="py-3 pr-3 font-semibold">#{index + 1}</td>
                      <td className="py-3 pr-3">
                        <span className="font-medium">
                          {bid.manufacturerId?.businessName}
                        </span>
                        {bid.manufacturerId?.verificationStatus === "verified"
                          ? " ✓"
                          : ""}
                      </td>
                      <td className="py-3 pr-3">
                        {formatCurrency(bid.amount)}
                      </td>
                      <td className="py-3 pr-3">{bid.timeline} days</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`font-semibold ${scoreBand.className}`}
                        >
                          {scoreBand.label}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        {bid.status.replaceAll("_", " ")}
                      </td>
                      <td className="py-3 pr-3">
                        <button
                          onClick={() => router.push(`/bids/${bid._id}`)}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="bg-white border rounded p-5 overflow-x-auto">
            <h2 className="text-xl font-semibold mb-3">
              Side-by-Side Matrix ({selectedBids.length} selected)
            </h2>

            {selectedBids.length < 2 ? (
              <p className="text-sm text-gray-600">
                Select at least two bids from the table above to compare.
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-3">Metric</th>
                    {selectedBids.map((bid) => (
                      <th key={bid._id} className="text-left py-3 pr-3">
                        {bid.manufacturerId?.businessName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 pr-3 font-medium">Amount</td>
                    {selectedBids.map((bid) => {
                      const isBest =
                        bid.amount === matrixBenchmarks?.lowestAmount;
                      return (
                        <td
                          key={`${bid._id}-amount`}
                          className={`py-3 pr-3 ${isBest ? "text-green-700 font-semibold" : ""}`}
                        >
                          {formatCurrency(bid.amount)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pr-3 font-medium">Timeline</td>
                    {selectedBids.map((bid) => {
                      const isBest =
                        bid.timeline === matrixBenchmarks?.shortestTimeline;
                      return (
                        <td
                          key={`${bid._id}-timeline`}
                          className={`py-3 pr-3 ${isBest ? "text-green-700 font-semibold" : ""}`}
                        >
                          {bid.timeline} days
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pr-3 font-medium">Verification</td>
                    {selectedBids.map((bid) => {
                      const isVerified =
                        bid.manufacturerId?.verificationStatus === "verified";

                      return (
                        <td
                          key={`${bid._id}-verification`}
                          className={`py-3 pr-3 ${isVerified ? "text-green-700 font-semibold" : ""}`}
                        >
                          {isVerified ? "Verified" : "Not verified"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pr-3 font-medium">Rating</td>
                    {selectedBids.map((bid) => {
                      const rating =
                        bid.manufacturerId?.stats?.averageRating || 0;
                      const isBest = rating === matrixBenchmarks?.highestRating;

                      return (
                        <td
                          key={`${bid._id}-rating`}
                          className={`py-3 pr-3 ${isBest ? "text-green-700 font-semibold" : ""}`}
                        >
                          {rating.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 pr-3 font-medium">Recommendation</td>
                    {selectedBids.map((bid) => {
                      const score = bid.ranking?.overallScore || 0;
                      const isBest = score === matrixBenchmarks?.highestScore;
                      const scoreBand = getScoreBand(score);

                      return (
                        <td
                          key={`${bid._id}-overall`}
                          className={`py-3 pr-3 ${isBest ? "text-green-700 font-semibold" : ""}`}
                        >
                          <span className={scoreBand.className}>
                            {scoreBand.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 pr-3 font-medium">Status</td>
                    {selectedBids.map((bid) => (
                      <td key={`${bid._id}-status`} className="py-3 pr-3">
                        {bid.status.replaceAll("_", " ")}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
