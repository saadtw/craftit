import Bid from "@/models/Bid";
import RFQ from "@/models/RFQ";
import User from "@/models/User";

export const bidService = {
  async placeBid(manufacturerId, bidData) {
    const rfq = await RFQ.findById(bidData.rfqId);

    if (!rfq) {
      throw new Error("RFQ not found");
    }

    if (rfq.status !== "active") {
      throw new Error("RFQ is not active");
    }

    if (new Date() > rfq.endDate) {
      throw new Error("RFQ has expired");
    }

    if (rfq.minBidThreshold && bidData.amount < rfq.minBidThreshold) {
      throw new Error(`Bid must be at least ${rfq.minBidThreshold}`);
    }

    const existingBid = await Bid.findOne({
      rfqId: bidData.rfqId,
      manufacturerId,
      status: { $nin: ["withdrawn", "rejected"] },
    });

    if (existingBid) {
      throw new Error("You have already placed a bid on this RFQ");
    }

    const bid = await Bid.create({
      ...bidData,
      manufacturerId,
      status: "pending",
    });

    // Update RFQ bids count
    await RFQ.findByIdAndUpdate(rfq._id, {
      $inc: { bidsCount: 1 },
    });

    await bid.populate("manufacturerId", "businessName email");

    return bid;
  },

  async getManufacturerBids(manufacturerId, filters = {}) {
    const query = { manufacturerId };

    if (filters.status) {
      query.status = filters.status;
    }

    const bids = await Bid.find(query)
      .populate("rfqId")
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);

    return bids;
  },

  async getBidById(bidId, userId, userRole) {
    const bid = await Bid.findById(bidId)
      .populate(
        "manufacturerId",
        "businessName email stats.averageRating location"
      )
      .populate("rfqId");

    if (!bid) {
      throw new Error("Bid not found");
    }

    if (
      userRole === "manufacturer" &&
      bid.manufacturerId._id.toString() !== userId
    ) {
      throw new Error("Not authorized");
    }

    if (userRole === "customer" && bid.rfqId.customerId.toString() !== userId) {
      throw new Error("Not authorized");
    }

    return bid;
  },

  async updateBid(bidId, manufacturerId, updateData) {
    const bid = await Bid.findOne({ _id: bidId, manufacturerId });

    if (!bid) {
      throw new Error("Bid not found");
    }

    if (bid.status !== "pending") {
      throw new Error("Cannot update bid in current status");
    }

    const rfq = await RFQ.findById(bid.rfqId);
    if (new Date() > rfq.endDate) {
      throw new Error("RFQ has expired");
    }

    Object.assign(bid, updateData);
    await bid.save();

    return bid;
  },

  async withdrawBid(bidId, manufacturerId) {
    const bid = await Bid.findOne({ _id: bidId, manufacturerId });

    if (!bid) {
      throw new Error("Bid not found");
    }

    if (bid.status === "accepted") {
      throw new Error("Cannot withdraw accepted bid");
    }

    bid.status = "withdrawn";
    bid.withdrawnAt = new Date();
    await bid.save();

    // Decrement RFQ bids count
    await RFQ.findByIdAndUpdate(bid.rfqId, {
      $inc: { bidsCount: -1 },
    });

    return bid;
  },

  async getRFQBids(rfqId, customerId) {
    const rfq = await RFQ.findOne({ _id: rfqId, customerId });

    if (!rfq) {
      throw new Error("RFQ not found or not authorized");
    }

    const bids = await Bid.find({
      rfqId,
      status: { $ne: "withdrawn" },
    })
      .populate(
        "manufacturerId",
        "businessName email stats.averageRating location verificationStatus"
      )
      .sort({ amount: 1 });

    return bids;
  },

  async addCounterOffer(bidId, userId, userRole, counterOfferData) {
    const bid = await Bid.findById(bidId).populate("rfqId");

    if (!bid) {
      throw new Error("Bid not found");
    }

    if (userRole === "customer" && bid.rfqId.customerId.toString() !== userId) {
      throw new Error("Not authorized");
    }

    if (
      userRole === "manufacturer" &&
      bid.manufacturerId.toString() !== userId
    ) {
      throw new Error("Not authorized");
    }

    bid.counterOffers.push({
      from: userRole,
      ...counterOfferData,
    });

    await bid.save();

    return bid;
  },

  calculateBidRanking(bids) {
    return bids
      .map((bid, index) => ({
        ...bid.toObject(),
        priceRank: index + 1,
        timelineRank:
          bids
            .sort((a, b) => a.timeline - b.timeline)
            .findIndex((b) => b._id.equals(bid._id)) + 1,
      }))
      .sort((a, b) => a.amount - b.amount);
  },
};
