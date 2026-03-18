"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function BidComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [bids, setBids] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (status === "loading" || loading) return <div>Loading bids...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Bid Comparison</h1>

      {analysis && (
        <div
          style={{
            marginBottom: "30px",
            padding: "15px",
            border: "1px solid #ddd",
          }}
        >
          <h2>Analysis</h2>
          <p>Total Bids: {analysis.totalBids}</p>
          <p>
            Price Range: ${analysis.priceRange.min} - ${analysis.priceRange.max}
          </p>
          <p>Average Price: ${analysis.priceRange.average.toFixed(2)}</p>
          <p>
            Timeline Range: {analysis.timelineRange.min} -{" "}
            {analysis.timelineRange.max} days
          </p>
          <p>Verified Manufacturers: {analysis.verifiedManufacturers}</p>
        </div>
      )}

      {bids.length === 0 ? (
        <p>No bids received yet</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>Rank</th>
              <th style={{ padding: "10px", textAlign: "left" }}>
                Manufacturer
              </th>
              <th style={{ padding: "10px", textAlign: "left" }}>Amount</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Timeline</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Score</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid, index) => (
              <tr key={bid._id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "10px" }}>{index + 1}</td>
                <td style={{ padding: "10px" }}>
                  {bid.manufacturerId.businessName}
                  {bid.manufacturerId.verificationStatus === "verified" && " ✓"}
                </td>
                <td style={{ padding: "10px" }}>${bid.amount}</td>
                <td style={{ padding: "10px" }}>{bid.timeline} days</td>
                <td style={{ padding: "10px" }}>
                  {bid.ranking?.overallScore || 0}
                </td>
                <td style={{ padding: "10px" }}>{bid.status}</td>
                <td style={{ padding: "10px" }}>
                  <button
                    onClick={() => router.push(`/customer/bids/${bid._id}`)}
                    style={{ padding: "5px 10px", marginRight: "5px" }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
