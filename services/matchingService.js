import User from "@/models/User";
import RFQ from "@/models/RFQ";
import CustomOrder from "@/models/CustomOrder";

export const matchingService = {
  async getRecommendedRFQs(manufacturerId) {
    const manufacturer = await User.findById(manufacturerId);

    if (!manufacturer || manufacturer.role !== "manufacturer") {
      throw new Error("Invalid manufacturer");
    }

    const activeRFQs = await RFQ.find({
      status: "active",
      endDate: { $gt: new Date() },
    })
      .populate("customOrderId")
      .populate("customerId", "name email location");

    const scoredRFQs = activeRFQs
      .filter((rfq) => rfq.customOrderId)
      .map((rfq) => {
        let score = 0;
        const customOrder = rfq.customOrderId;

        if (
          manufacturer.materialsAvailable &&
          customOrder.materialPreferences
        ) {
          const matchingMaterials = customOrder.materialPreferences.filter(
            (mat) => manufacturer.materialsAvailable.includes(mat)
          );
          score += matchingMaterials.length * 10;
        }

        // Match budget
        if (manufacturer.budgetRange && customOrder.budget) {
          if (
            customOrder.budget >= manufacturer.budgetRange.min &&
            customOrder.budget <= manufacturer.budgetRange.max
          ) {
            score += 20;
          }
        }

        // Match location
        if (manufacturer.location && rfq.customerId.location) {
          if (manufacturer.location.state === rfq.customerId.location.state) {
            score += 10;
          }
        }

        // Check deadline
        if (customOrder.deadline) {
          const daysUntilDeadline = Math.floor(
            (new Date(customOrder.deadline) - new Date()) /
              (1000 * 60 * 60 * 24)
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

    return scoredRFQs
      .filter((item) => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  },

  getMatchReasons(manufacturer, rfq, customOrder) {
    const reasons = [];

    // Material matching
    if (manufacturer.materialsAvailable && customOrder.materialPreferences) {
      const matching = customOrder.materialPreferences.filter((mat) =>
        manufacturer.materialsAvailable.includes(mat)
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
    const query = {
      status: "active",
      endDate: { $gt: new Date() },
    };

    let rfqs = await RFQ.find(query)
      .populate("customOrderId")
      .populate("customerId", "name email location")
      .limit(50);

    // Filter by custom order properties
    if (filters.minBudget || filters.maxBudget || filters.materials) {
      rfqs = rfqs.filter((rfq) => {
        if (!rfq.customOrderId) return false;

        const customOrder = rfq.customOrderId;

        // Budget filter
        if (
          filters.minBudget &&
          customOrder.budget < Number(filters.minBudget)
        ) {
          return false;
        }
        if (
          filters.maxBudget &&
          customOrder.budget > Number(filters.maxBudget)
        ) {
          return false;
        }

        // Materials filter
        if (filters.materials) {
          const requestedMaterials = filters.materials
            .split(",")
            .map((m) => m.trim());
          const hasMatchingMaterial = requestedMaterials.some((mat) =>
            customOrder.materialPreferences?.includes(mat)
          );
          if (!hasMatchingMaterial) return false;
        }

        return true;
      });
    }

    // Location filter
    if (filters.location) {
      rfqs = rfqs.filter(
        (rfq) => rfq.customerId?.location?.country === filters.location
      );
    }

    // Sort results
    if (filters.sort === "deadline") {
      rfqs = rfqs.sort(
        (a, b) =>
          new Date(a.customOrderId?.deadline || 0) -
          new Date(b.customOrderId?.deadline || 0)
      );
    } else if (filters.sort === "budget-high") {
      rfqs = rfqs.sort(
        (a, b) =>
          (b.customOrderId?.budget || 0) - (a.customOrderId?.budget || 0)
      );
    } else if (filters.sort === "budget-low") {
      rfqs = rfqs.sort(
        (a, b) =>
          (a.customOrderId?.budget || 0) - (b.customOrderId?.budget || 0)
      );
    } else {
      rfqs = rfqs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return rfqs;
  },
};
