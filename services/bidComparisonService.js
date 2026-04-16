import Bid from "@/models/Bid";

export const bidComparisonService = {
  async compareRFQBids(rfqId) {
    const bids = await Bid.find({
      rfqId,
      status: { $ne: "withdrawn" },
    }).populate(
      "manufacturerId",
      "businessName stats.averageRating location verificationStatus",
    );

    if (bids.length === 0) {
      return { bids: [], analysis: null };
    }

    const sortedByPrice = [...bids].sort((a, b) => a.amount - b.amount);
    const sortedByTimeline = [...bids].sort((a, b) => a.timeline - b.timeline);

    const analysis = {
      totalBids: bids.length,
      priceRange: {
        min: sortedByPrice[0].amount,
        max: sortedByPrice[sortedByPrice.length - 1].amount,
        average: bids.reduce((sum, bid) => sum + bid.amount, 0) / bids.length,
      },
      timelineRange: {
        min: sortedByTimeline[0].timeline,
        max: sortedByTimeline[sortedByTimeline.length - 1].timeline,
        average: bids.reduce((sum, bid) => sum + bid.timeline, 0) / bids.length,
      },
      verifiedManufacturers: bids.filter(
        (b) => b.manufacturerId.verificationStatus === "verified",
      ).length,
    };

    const rankedBids = bids.map((bid) => {
      const priceRank =
        sortedByPrice.findIndex((b) => b._id.equals(bid._id)) + 1;
      const timelineRank =
        sortedByTimeline.findIndex((b) => b._id.equals(bid._id)) + 1;

      const priceScore = ((bids.length - priceRank + 1) / bids.length) * 40;
      const timelineScore =
        ((bids.length - timelineRank + 1) / bids.length) * 30;
      const verificationScore =
        bid.manufacturerId.verificationStatus === "verified" ? 20 : 0;
      const ratingScore = (bid.manufacturerId.stats?.averageRating || 0) * 2;

      const totalScore =
        priceScore + timelineScore + verificationScore + ratingScore;

      return {
        ...bid.toObject(),
        ranking: {
          priceRank,
          timelineRank,
          overallScore: Math.round(totalScore),
          scoreBreakdown: {
            price: Math.round(priceScore * 10) / 10,
            timeline: Math.round(timelineScore * 10) / 10,
            verification: verificationScore,
            rating: Math.round(ratingScore * 10) / 10,
            max: {
              price: 40,
              timeline: 30,
              verification: 20,
              rating: 10,
              total: 100,
            },
          },
          pricePercentile: Math.round(
            (1 - (priceRank - 1) / bids.length) * 100,
          ),
          timelinePercentile: Math.round(
            (1 - (timelineRank - 1) / bids.length) * 100,
          ),
        },
      };
    });

    rankedBids.sort((a, b) => b.ranking.overallScore - a.ranking.overallScore);

    return { bids: rankedBids, analysis };
  },

  async getBidDetails(bidId) {
    const bid = await Bid.findById(bidId)
      .populate(
        "manufacturerId",
        "businessName stats.averageRating location verificationStatus",
      )
      .populate("rfqId");

    if (!bid) {
      throw new Error("Bid not found");
    }

    const costBreakdownObj = bid.costBreakdown
      ? bid.toObject().costBreakdown
      : {};
    const totalCost = Object.values(costBreakdownObj).reduce(
      (sum, val) => sum + (val || 0),
      0,
    );

    const costAnalysis = {
      totalBreakdown: totalCost,
      discrepancy: Math.abs(totalCost - bid.amount),
      materialsPercentage: totalCost
        ? (((costBreakdownObj.materials || 0) / totalCost) * 100).toFixed(1)
        : 0,
      laborPercentage: totalCost
        ? (((costBreakdownObj.labor || 0) / totalCost) * 100).toFixed(1)
        : 0,
      profitMargin: totalCost
        ? (((costBreakdownObj.profit || 0) / bid.amount) * 100).toFixed(1)
        : 0,
    };

    return {
      bid,
      costAnalysis,
    };
  },
};
