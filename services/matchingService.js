import User from "@/models/User";
import RFQ from "@/models/RFQ";
import CustomOrder from "@/models/CustomOrder";
import mongoose from "mongoose";

export const matchingService = {
  async getRecommendedRFQs(manufacturerId) {
    const manufacturer = await User.findById(manufacturerId);

    if (!manufacturer || manufacturer.role !== "manufacturer") {
      throw new Error("Invalid manufacturer");
    }

    // Build aggregation pipeline for efficient filtering
    const pipeline = [
      // Match active RFQs
      {
        $match: {
          status: "active",
          endDate: { $gt: new Date() },
          $or: [
            { broadcastToAll: true },
            { targetManufacturers: manufacturer._id },
          ],
        },
      },
      // Join with CustomOrder (required)
      {
        $lookup: {
          from: "customorders",
          localField: "customOrderId",
          foreignField: "_id",
          as: "customOrderId",
        },
      },
      {
        $unwind: {
          path: "$customOrderId",
          preserveNullAndEmptyArrays: false, // Exclude RFQs without customOrder at DB level
        },
      },
      // Join with Customer
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customerId",
        },
      },
      {
        $unwind: {
          path: "$customerId",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Add DB-level filters based on manufacturer preferences
    const dbFilters = {};

    // Filter by materials at DB level
    if (
      manufacturer.materialsAvailable &&
      manufacturer.materialsAvailable.length > 0
    ) {
      dbFilters["customOrderId.materialPreferences"] = {
        $in: manufacturer.materialsAvailable,
      };
    }

    // Filter by budget range at DB level
    if (manufacturer.budgetRange) {
      if (manufacturer.budgetRange.min || manufacturer.budgetRange.max) {
        dbFilters["customOrderId.budget"] = {};
        if (manufacturer.budgetRange.min) {
          dbFilters["customOrderId.budget"].$gte = manufacturer.budgetRange.min;
        }
        if (manufacturer.budgetRange.max) {
          dbFilters["customOrderId.budget"].$lte = manufacturer.budgetRange.max;
        }
      }
    }

    // Add location filter at DB level if specified
    if (manufacturer.location?.state) {
      dbFilters["customerId.location.state"] = manufacturer.location.state;
    }

    // Apply filters if any exist
    if (Object.keys(dbFilters).length > 0) {
      pipeline.push({ $match: dbFilters });
    }

    // Limit to reasonable number
    pipeline.push({ $limit: 100 });

    // Project only needed fields
    pipeline.push({
      $project: {
        "customerId.password": 0,
        "customerId.verificationDocuments": 0,
      },
    });

    const activeRFQs = await RFQ.aggregate(pipeline);

    // Calculate scores (this part still needs JavaScript for complex logic)
    const scoredRFQs = activeRFQs.map((rfq) => {
      let score = 0;
      const customOrder = rfq.customOrderId;

      // Material matching score
      if (manufacturer.materialsAvailable && customOrder.materialPreferences) {
        const matchingMaterials = customOrder.materialPreferences.filter(
          (mat) => manufacturer.materialsAvailable.includes(mat),
        );
        score += matchingMaterials.length * 10;
      }

      // Budget match score
      if (manufacturer.budgetRange && customOrder.budget) {
        if (
          customOrder.budget >= manufacturer.budgetRange.min &&
          customOrder.budget <= manufacturer.budgetRange.max
        ) {
          score += 20;
        }
      }

      // Location match score
      if (manufacturer.location && rfq.customerId.location) {
        if (manufacturer.location.state === rfq.customerId.location.state) {
          score += 10;
        }
      }

      // Deadline feasibility score
      if (customOrder.deadline) {
        const daysUntilDeadline = Math.floor(
          (new Date(customOrder.deadline) - new Date()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilDeadline >= 7) {
          score += 5;
        }
      }

      return {
        rfq,
        matchScore: score,
        matchReasons: this.getMatchReasons(manufacturer, rfq, customOrder),
      };
    });

    // Sort by match score and return
    return scoredRFQs
      .filter((item) => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  },

  getMatchReasons(manufacturer, rfq, customOrder) {
    const reasons = [];

    // Material matching
    if (manufacturer.materialsAvailable && customOrder.materialPreferences) {
      const matching = customOrder.materialPreferences.filter((mat) =>
        manufacturer.materialsAvailable.includes(mat),
      );
      if (matching.length > 0) {
        reasons.push(`Materials match: ${matching.join(", ")}`);
      }
    }

    // Budget matching
    if (manufacturer.budgetRange && customOrder.budget) {
      if (
        customOrder.budget >= manufacturer.budgetRange.min &&
        customOrder.budget <= manufacturer.budgetRange.max
      ) {
        reasons.push("Budget within your range");
      }
    }

    // Location matching
    if (manufacturer.location && rfq.customerId.location) {
      if (manufacturer.location.state === rfq.customerId.location.state) {
        reasons.push("Same state");
      }
    }

    return reasons;
  },

  async searchRFQs(manufacturerId, filters) {
    const manufacturerRef = mongoose.Types.ObjectId.isValid(manufacturerId)
      ? new mongoose.Types.ObjectId(manufacturerId)
      : manufacturerId;

    // Build aggregation pipeline for DB-level filtering
    const pipeline = [
      // Initial match for active RFQs
      {
        $match: {
          status: "active",
          endDate: { $gt: new Date() },
          $or: [
            { broadcastToAll: true },
            { targetManufacturers: manufacturerRef },
          ],
        },
      },
      // Join with CustomOrder
      {
        $lookup: {
          from: "customorders",
          localField: "customOrderId",
          foreignField: "_id",
          as: "customOrderId",
        },
      },
      {
        $unwind: {
          path: "$customOrderId",
          preserveNullAndEmptyArrays: false, // Exclude RFQs without customOrder
        },
      },
      // Join with Customer
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customerId",
        },
      },
      {
        $unwind: {
          path: "$customerId",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Add budget filters at DB level
    if (filters.minBudget || filters.maxBudget) {
      const budgetMatch = {};
      if (filters.minBudget) {
        budgetMatch["customOrderId.budget"] = {
          $gte: Number(filters.minBudget),
        };
      }
      if (filters.maxBudget) {
        if (budgetMatch["customOrderId.budget"]) {
          budgetMatch["customOrderId.budget"].$lte = Number(filters.maxBudget);
        } else {
          budgetMatch["customOrderId.budget"] = {
            $lte: Number(filters.maxBudget),
          };
        }
      }
      pipeline.push({ $match: budgetMatch });
    }

    // Add materials filter at DB level
    if (filters.materials) {
      const requestedMaterials = filters.materials
        .split(",")
        .map((m) => m.trim());
      pipeline.push({
        $match: {
          "customOrderId.materialPreferences": {
            $in: requestedMaterials,
          },
        },
      });
    }

    // Add location filter at DB level
    if (filters.location) {
      pipeline.push({
        $match: {
          "customerId.location.country": filters.location,
        },
      });
    }

    // Add sorting at DB level
    let sortStage = {};
    if (filters.sort === "deadline") {
      sortStage = { "customOrderId.deadline": 1 };
    } else if (filters.sort === "budget-high") {
      sortStage = { "customOrderId.budget": -1 };
    } else if (filters.sort === "budget-low") {
      sortStage = { "customOrderId.budget": 1 };
    } else {
      sortStage = { createdAt: -1 };
    }
    pipeline.push({ $sort: sortStage });

    // Limit results
    pipeline.push({ $limit: filters.limit || 50 });

    // Project only needed fields from customer
    pipeline.push({
      $project: {
        "customerId.password": 0,
        "customerId.verificationDocuments": 0,
      },
    });

    const rfqs = await RFQ.aggregate(pipeline);

    return rfqs;
  },
};
