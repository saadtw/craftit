"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
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
  if (score >= 85)
    return {
      label: "Strong Match",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    };
  if (score >= 70)
    return {
      label: "Good Match",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    };
  return {
    label: "Needs Review",
    color: "text-amber-400",
    bg: "bg-[#eb9728]/10 border-[#eb9728]/20",
  };
}

function getBidHighlights(bid, benchmarks) {
  const highlights = [];
  const amount = Number(bid?.amount || 0);
  const timeline = Number(bid?.timeline || 0);
  const rating = Number(bid?.manufacturerId?.stats?.averageRating || 0);
  const isVerified = bid?.manufacturerId?.verificationStatus === "verified";

  if (benchmarks && amount === benchmarks.lowestAmount)
    highlights.push({ label: "Best price", icon: "payments" });
  if (benchmarks && timeline === benchmarks.shortestTimeline)
    highlights.push({ label: "Fastest delivery", icon: "bolt" });
  if (isVerified) highlights.push({ label: "Verified", icon: "verified" });
  if (benchmarks && rating > 0 && rating === benchmarks.highestRating)
    highlights.push({ label: "Top rated", icon: "star" });
  if ((bid?.ranking?.overallScore || 0) >= 85)
    highlights.push({ label: "Strong fit", icon: "thumb_up" });
  if (highlights.length === 0)
    highlights.push({ label: "Balanced offer", icon: "balance" });

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
      if (valid.length >= 2 || bids.length < 2) return valid;
      return bids.slice(0, Math.min(2, bids.length)).map((bid) => bid._id);
    });
  }, [bids]);

  const selectedBids = useMemo(
    () => bids.filter((bid) => selectedBidIds.includes(bid._id)),
    [bids, selectedBidIds],
  );

  const allBidBenchmarks = useMemo(() => {
    if (bids.length === 0) return null;
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
    if (selectedBids.length === 0) return null;
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
      if (prev.includes(bidId)) return prev.filter((id) => id !== bidId);
      if (prev.length >= MAX_COMPARE_BIDS) {
        alert(`You can compare up to ${MAX_COMPARE_BIDS} bids at once.`);
        return prev;
      }
      return [...prev, bidId];
    });
  };

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading bids..." />;
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  const topBidsForExplainability = bids.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
              RFQ
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Bid Comparison
            </h1>
          </div>
          <button
            onClick={() => router.push(`/customer/rfqs/${params.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/65 hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            Back to RFQ
          </button>
        </div>

        {/* Analysis Stats */}
        {analysis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Bids", value: analysis.totalBids, icon: "gavel" },
              {
                label: "Price Range",
                value: `${formatCurrency(analysis.priceRange.min)} – ${formatCurrency(analysis.priceRange.max)}`,
                sub: `Avg: ${formatCurrency(analysis.priceRange.average)}`,
                icon: "payments",
              },
              {
                label: "Timeline Range",
                value: `${analysis.timelineRange.min}–${analysis.timelineRange.max} days`,
                sub: `Avg: ${analysis.timelineRange.average.toFixed(1)} days`,
                icon: "schedule",
              },
              {
                label: "Verified Makers",
                value: analysis.verifiedManufacturers,
                icon: "verified",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/8 bg-[#0c0c11] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2">
                      {stat.label}
                    </p>
                    <p className="text-xl font-black text-white">
                      {stat.value}
                    </p>
                    {stat.sub && (
                      <p className="text-[11px] text-white/35 mt-1">
                        {stat.sub}
                      </p>
                    )}
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-white/[0.05] border border-white/8 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-white/40">
                      {stat.icon}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {bids.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-white/20">
                gavel
              </span>
            </div>
            <p className="text-sm text-white/40">No bids received yet.</p>
          </div>
        ) : (
          <>
            {/* Recommendations */}
            <section className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/8">
                <h2 className="text-base font-bold text-white">
                  How Recommendations Are Generated
                </h2>
                <p className="text-[11px] text-white/35 mt-1 leading-relaxed">
                  Recommendations combine price competitiveness, delivery
                  timeline, manufacturer verification, and reliability signals.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/6">
                {topBidsForExplainability.map((bid, index) => {
                  const score = bid.ranking?.overallScore || 0;
                  const scoreBand = getScoreBand(score);
                  const highlights = getBidHighlights(bid, allBidBenchmarks);

                  return (
                    <div key={bid._id} className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-[#eb9728]/10 border border-[#eb9728]/20 flex items-center justify-center text-xs font-black text-[#eb9728]">
                            {index + 1}
                          </div>
                          <p className="text-sm font-bold text-white truncate">
                            {bid.manufacturerId?.businessName}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${scoreBand.bg} ${scoreBand.color}`}
                        >
                          {scoreBand.label}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {[
                          {
                            label: "Bid",
                            value: formatCurrency(bid.amount),
                            icon: "payments",
                          },
                          {
                            label: "Timeline",
                            value: `${bid.timeline} days`,
                            icon: "schedule",
                          },
                          {
                            label: "Rating",
                            value: (
                              bid.manufacturerId?.stats?.averageRating || 0
                            ).toFixed(1),
                            icon: "star",
                          },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[13px] text-white/30">
                                {row.icon}
                              </span>
                              <span className="text-[11px] text-white/40">
                                {row.label}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-white/70">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {highlights.map((h) => (
                          <span
                            key={`${bid._id}-${h.label}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-white/55"
                          >
                            <span className="material-symbols-outlined text-[11px]">
                              {h.icon}
                            </span>
                            {h.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* All Bids Table */}
            <section className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">All Bids</h2>
                <p className="text-[11px] text-white/35">
                  Select up to {MAX_COMPARE_BIDS} bids for side-by-side
                  comparison
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      {[
                        "Compare",
                        "Rank",
                        "Manufacturer",
                        "Amount",
                        "Timeline",
                        "Recommendation",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bids.map((bid, index) => {
                      const score = bid.ranking?.overallScore || 0;
                      const scoreBand = getScoreBand(score);
                      const isSelected = selectedBidIds.includes(bid._id);

                      return (
                        <tr
                          key={bid._id}
                          className={`transition-colors hover:bg-white/[0.025] ${isSelected ? "bg-[#eb9728]/5" : ""}`}
                        >
                          <td className="py-3 px-4">
                            <div
                              onClick={() => handleToggleCompare(bid._id)}
                              className={`h-5 w-5 rounded-md border-2 cursor-pointer flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#eb9728] border-[#eb9728]"
                                  : "border-white/20 hover:border-white/40"
                              }`}
                            >
                              {isSelected && (
                                <span className="material-symbols-outlined text-[13px] text-white">
                                  check
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="h-7 w-7 rounded-full bg-white/[0.05] border border-white/8 flex items-center justify-center text-xs font-black text-white/50">
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white/80">
                                {bid.manufacturerId?.businessName}
                              </span>
                              {bid.manufacturerId?.verificationStatus ===
                                "verified" && (
                                <span className="material-symbols-outlined text-[14px] text-emerald-400">
                                  verified
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-white/80">
                            {formatCurrency(bid.amount)}
                          </td>
                          <td className="py-3 px-4 text-sm text-white/60">
                            {bid.timeline} days
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${scoreBand.bg} ${scoreBand.color}`}
                            >
                              {scoreBand.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] text-white/50 capitalize">
                              {bid.status.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => router.push(`/bids/${bid._id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eb9728]/10 border border-[#eb9728]/20 text-[11px] font-bold text-[#eb9728] hover:bg-[#eb9728]/20 transition-colors"
                            >
                              View
                              <span className="material-symbols-outlined text-[13px]">
                                arrow_forward
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Side-by-Side Matrix */}
            <section className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">
                  Side-by-Side Matrix
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]">
                  {selectedBids.length} selected
                </span>
              </div>

              {selectedBids.length < 2 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-white/15 block mb-2">
                    compare
                  </span>
                  <p className="text-sm text-white/35">
                    Select at least two bids from the table above to compare.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/6">
                        <th className="text-left py-3 px-6 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 w-36">
                          Metric
                        </th>
                        {selectedBids.map((bid) => (
                          <th
                            key={bid._id}
                            className="text-left py-3 px-6 text-sm font-bold text-white/70"
                          >
                            {bid.manufacturerId?.businessName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        {
                          label: "Amount",
                          render: (bid) => {
                            const isBest =
                              bid.amount === matrixBenchmarks?.lowestAmount;
                            return (
                              <span
                                className={`font-bold ${isBest ? "text-emerald-400" : "text-white/70"}`}
                              >
                                {formatCurrency(bid.amount)}
                                {isBest && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    Best
                                  </span>
                                )}
                              </span>
                            );
                          },
                        },
                        {
                          label: "Timeline",
                          render: (bid) => {
                            const isBest =
                              bid.timeline ===
                              matrixBenchmarks?.shortestTimeline;
                            return (
                              <span
                                className={`font-bold ${isBest ? "text-emerald-400" : "text-white/70"}`}
                              >
                                {bid.timeline} days
                                {isBest && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    Fastest
                                  </span>
                                )}
                              </span>
                            );
                          },
                        },
                        {
                          label: "Verification",
                          render: (bid) => {
                            const isVerified =
                              bid.manufacturerId?.verificationStatus ===
                              "verified";
                            return (
                              <span
                                className={`flex items-center gap-1.5 font-bold ${isVerified ? "text-emerald-400" : "text-white/35"}`}
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  {isVerified ? "verified" : "cancel"}
                                </span>
                                {isVerified ? "Verified" : "Not verified"}
                              </span>
                            );
                          },
                        },
                        {
                          label: "Rating",
                          render: (bid) => {
                            const rating =
                              bid.manufacturerId?.stats?.averageRating || 0;
                            const isBest =
                              rating === matrixBenchmarks?.highestRating;
                            return (
                              <span
                                className={`flex items-center gap-1 font-bold ${isBest ? "text-emerald-400" : "text-white/70"}`}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  star
                                </span>
                                {rating.toFixed(1)}
                                {isBest && (
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    Top
                                  </span>
                                )}
                              </span>
                            );
                          },
                        },
                        {
                          label: "Recommendation",
                          render: (bid) => {
                            const score = bid.ranking?.overallScore || 0;
                            const isBest =
                              score === matrixBenchmarks?.highestScore;
                            const scoreBand = getScoreBand(score);
                            return (
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${isBest ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : `${scoreBand.bg} ${scoreBand.color}`}`}
                              >
                                {scoreBand.label}
                              </span>
                            );
                          },
                        },
                        {
                          label: "Status",
                          render: (bid) => (
                            <span className="text-[11px] text-white/50 capitalize">
                              {bid.status.replaceAll("_", " ")}
                            </span>
                          ),
                        },
                      ].map((row) => (
                        <tr
                          key={row.label}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4 px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-white/30">
                            {row.label}
                          </td>
                          {selectedBids.map((bid) => (
                            <td
                              key={`${bid._id}-${row.label}`}
                              className="py-4 px-6"
                            >
                              {row.render(bid)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
