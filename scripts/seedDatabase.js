// scripts/seedDatabase.js
// Run with: node --env-file=.env.local scripts/seedDatabase.js

import mongoose from "mongoose";
import { faker } from "@faker-js/faker";

// In Next.js app runtime, env files are loaded automatically.
// This standalone Node script should be run with:
// node --env-file=.env.local scripts/seedDatabase.js

// Import all models
import User from "../models/User.js";
import Product from "../models/Product.js";
import CustomOrder from "../models/CustomOrder.js";
import RFQ from "../models/RFQ.js";
import Bid from "../models/Bid.js";
import Order from "../models/Order.js";
import GroupBuy from "../models/GroupBuy.js";
import Review from "../models/Review.js";
import Dispute from "../models/Dispute.js";
import Notification from "../models/Notification.js";
import AdminLog from "../models/AdminLog.js";
import VerificationDocument from "../models/VerificationDocument.js";
import Chat from "../models/Chat.js";
import ChatMessage from "../models/ChatMessage.js";
import ProductQuestion from "../models/ProductQuestion.js";
import SupportTicket from "../models/SupportTicket.js";
import SupportTicketMessage from "../models/SupportTicketMessage.js";

// Configuration
const CONFIG = {
  ADMINS: 2,
  CUSTOMERS: 25,
  MANUFACTURERS: 15,
  PRODUCTS_PER_MANUFACTURER: 5, // avg
  CUSTOM_ORDERS_PER_CUSTOMER: 2,
  RFQS_PERCENTAGE: 0.6, // 60% of custom orders become RFQs
  BIDS_PER_RFQ: 4, // avg
  GROUP_BUYS_PER_MANUFACTURER: 2,
  ORDERS_PER_CUSTOMER: 3,
  REVIEWS_PERCENTAGE: 0.7, // 70% of completed orders get reviewed
  DISPUTES_PERCENTAGE: 0.1, // 10% of orders get disputed
  MESSAGES_PER_CONVERSATION: 8,
};

// Helper: Random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper: Random subset of array
const randomSubset = (arr, min = 1, max = 3) => {
  const count = faker.number.int({ min, max: Math.min(max, arr.length) });
  return faker.helpers.arrayElements(arr, count);
};

// Helper: Random boolean with probability
const randomBool = (probability = 0.5) => Math.random() < probability;

// Data pools
const categories = [
  "Electronics",
  "Automotive",
  "Industrial",
  "Consumer Goods",
  "Medical",
  "Aerospace",
  "Furniture",
  "Tools",
  "Packaging",
  "Toys",
];

const materials = [
  "Steel",
  "Aluminum",
  "Plastic",
  "Copper",
  "Brass",
  "Wood",
  "Carbon_Fiber",
  "Titanium",
  "Rubber",
  "Glass",
];

const capabilities = [
  "CNC_Machining",
  "3D_Printing",
  "Injection_Molding",
  "Sheet_Metal",
  "Casting",
  "Welding",
  "Assembly",
  "Finishing",
  "Prototyping",
  "Mass_Production",
];

const businessTypes = [
  "sole_proprietorship",
  "partnership",
  "private_limited",
  "public_limited",
  "ngo",
  "other",
];

const pakistanCities = [
  { city: "Karachi", state: "Sindh" },
  { city: "Lahore", state: "Punjab" },
  { city: "Islamabad", state: "ICT" },
  { city: "Rawalpindi", state: "Punjab" },
  { city: "Faisalabad", state: "Punjab" },
  { city: "Multan", state: "Punjab" },
  { city: "Peshawar", state: "KPK" },
  { city: "Quetta", state: "Balochistan" },
  { city: "Sialkot", state: "Punjab" },
  { city: "Gujranwala", state: "Punjab" },
];

// ============================================================================
// 1. CREATE USERS
// ============================================================================

async function createUsers() {
  console.log("Creating users...");
  const users = { admins: [], customers: [], manufacturers: [] };

  // Admins
  for (let i = 0; i < CONFIG.ADMINS; i++) {
    const admin = await User.create({
      email: `admin${i + 1}@craftit.com`,
      password: "Admin123!", // Will be hashed by pre-save hook
      role: "admin",
      name: faker.person.fullName(),
      phone: faker.phone.number("+92 3## #######"),
      verificationStatus: "verified",
      isEmailVerified: true,
      emailVerifiedAt: faker.date.past(),
    });
    users.admins.push(admin);
  }

  // Customers
  for (let i = 0; i < CONFIG.CUSTOMERS; i++) {
    const location = randomItem(pakistanCities);
    const customer = await User.create({
      email: faker.internet.email().toLowerCase(),
      password: "Customer123!",
      role: "customer",
      name: faker.person.fullName(),
      phone: faker.phone.number("+92 3## #######"),
      location: {
        city: location.city,
        state: location.state,
        country: "Pakistan",
        coordinates: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
        },
      },
      verificationStatus: "verified",
      isEmailVerified: true,
      emailVerifiedAt: faker.date.past(),
      savedAddresses: [
        {
          label: "Home",
          name: faker.person.fullName(),
          street: faker.location.streetAddress(),
          city: location.city,
          state: location.state,
          country: "Pakistan",
          postalCode: faker.location.zipCode("#####"),
          phone: faker.phone.number("+92 3## #######"),
          isDefault: true,
        },
      ],
    });
    users.customers.push(customer);
  }

  // Manufacturers
  for (let i = 0; i < CONFIG.MANUFACTURERS; i++) {
    const location = randomItem(pakistanCities);
    const isVerified = randomBool(0.8); // 80% verified
    const manufacturer = await User.create({
      email: faker.internet.email().toLowerCase(),
      password: "Manufacturer123!",
      role: "manufacturer",
      name: faker.person.fullName(),
      phone: faker.phone.number("+92 3## #######"),
      businessName: faker.company.name(),
      contactPerson: faker.person.fullName(),
      businessEmail: faker.internet.email().toLowerCase(),
      businessPhone: faker.phone.number("+92 3## #######"),
      businessType: randomItem(businessTypes),
      businessDescription: faker.company.catchPhrase(),
      businessRegistrationNumber: faker.string.alphanumeric(10).toUpperCase(),
      location: {
        city: location.city,
        state: location.state,
        country: "Pakistan",
        coordinates: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
        },
      },
      businessAddress: {
        street: faker.location.streetAddress(),
        city: location.city,
        state: location.state,
        country: "Pakistan",
        postalCode: faker.location.zipCode("#####"),
      },
      manufacturingCapabilities: randomSubset(capabilities, 2, 5),
      materialsAvailable: randomSubset(materials, 3, 6),
      minOrderQuantity: faker.number.int({ min: 10, max: 500 }),
      verificationStatus: isVerified ? "verified" : "unverified",
      isEmailVerified: true,
      emailVerifiedAt: faker.date.past(),
      verifiedAt: isVerified ? faker.date.past() : null,
      verifiedBy: isVerified ? randomItem(users.admins)._id : null,
      stats: {
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
      },
    });
    users.manufacturers.push(manufacturer);
  }

  console.log(
    `✓ Created ${users.admins.length} admins, ${users.customers.length} customers, ${users.manufacturers.length} manufacturers`,
  );
  return users;
}

// ============================================================================
// 2. CREATE VERIFICATION DOCUMENTS
// ============================================================================

async function createVerificationDocuments(manufacturers, admins) {
  console.log("Creating verification documents...");
  const docs = [];

  for (const manufacturer of manufacturers) {
    // const docTypes = ["ntn_certificate", "secp_form_c", "chamber_certificate"];
    // Image/document file seeding is disabled for now.
    // Keep documents empty to avoid adding file/media URLs.
    const documents = [];
    // const documents = docTypes.map((type) => ({
    //   type,
    //   url: faker.image.url(),
    //   filename: `${type}_${faker.string.alphanumeric(8)}.pdf`,
    //   fileSize: faker.number.int({ min: 100000, max: 5000000 }),
    //   uploadedAt: faker.date.past(),
    // }));

    const verificationDoc = await VerificationDocument.create({
      manufacturerId: manufacturer._id,
      ntnNumber: faker.string.numeric(7),
      strnNumber: faker.string.numeric(10),
      secpRegistrationNumber: faker.string.alphanumeric(12).toUpperCase(),
      documents,
      verificationStatus:
        manufacturer.verificationStatus === "verified" ? "verified" : "pending",
      reviewedBy:
        manufacturer.verificationStatus === "verified"
          ? randomItem(admins)._id
          : null,
      reviewedAt:
        manufacturer.verificationStatus === "verified"
          ? faker.date.past()
          : null,
    });
    docs.push(verificationDoc);
  }

  console.log(`✓ Created ${docs.length} verification documents`);
  return docs;
}

// ============================================================================
// 3. CREATE PRODUCTS
// ============================================================================

async function createProducts(manufacturers) {
  console.log("Creating products...");
  const products = [];

  for (const manufacturer of manufacturers) {
    // Unverified manufacturers can only have up to 5 products
    const maxProducts =
      manufacturer.verificationStatus === "verified"
        ? CONFIG.PRODUCTS_PER_MANUFACTURER
        : Math.min(5, CONFIG.PRODUCTS_PER_MANUFACTURER);

    const productCount = faker.number.int({ min: 2, max: maxProducts });

    for (let i = 0; i < productCount; i++) {
      const category = randomItem(categories);
      const price = faker.number.int({ min: 500, max: 50000 });

      const product = await Product.create({
        manufacturerId: manufacturer._id,
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        category,
        subCategory: faker.commerce.department(),
        price,
        moq: faker.number.int({ min: 10, max: 500 }),
        stock: faker.number.int({ min: 0, max: 1000 }),
        // Image seeding disabled.
        images: [],
        // 3D model seeding disabled.
        // model3D:
        //   manufacturer.verificationStatus === "verified" && randomBool(0.3)
        //     ? {
        //         url: faker.image.url(),
        //         filename: `model_${faker.string.alphanumeric(8)}.stl`,
        //         fileSize: faker.number.int({ min: 500000, max: 10000000 }),
        //       }
        //     : undefined,
        specifications: {
          material: randomItem(materials),
          dimensions: {
            length: faker.number.int({ min: 10, max: 500 }),
            width: faker.number.int({ min: 10, max: 500 }),
            height: faker.number.int({ min: 10, max: 500 }),
            unit: "mm",
          },
          weight: faker.number.int({ min: 100, max: 5000 }),
          color: randomSubset(["Red", "Blue", "Green", "Black", "White"], 1, 3),
        },
        customizationOptions: randomBool(0.4),
        leadTime: faker.number.int({ min: 7, max: 60 }),
        tags: randomSubset(
          ["custom", "bulk", "industrial", "premium", "eco-friendly"],
          1,
          3,
        ),
        views: faker.number.int({ min: 0, max: 500 }),
        status: randomBool(0.8) ? "active" : "draft",
      });
      products.push(product);
    }
  }

  console.log(`✓ Created ${products.length} products`);
  return products;
}

// ============================================================================
// 4. CREATE CUSTOM ORDERS
// ============================================================================

async function createCustomOrders(customers) {
  console.log("Creating custom orders...");
  const customOrders = [];

  for (const customer of customers) {
    const orderCount = faker.number.int({
      min: 0,
      max: CONFIG.CUSTOM_ORDERS_PER_CUSTOMER,
    });

    for (let i = 0; i < orderCount; i++) {
      const customOrder = await CustomOrder.create({
        customerId: customer._id,
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        quantity: faker.number.int({ min: 50, max: 1000 }),
        materialPreferences: randomSubset(materials, 1, 3),
        colorSpecifications: randomSubset(
          ["Red", "Blue", "Green", "Black", "White"],
          1,
          2,
        ),
        deadline: faker.date.future(),
        // 3D model seeding disabled.
        // model3D: randomBool(0.7)
        //   ? {
        //       url: faker.image.url(),
        //       filename: `custom_${faker.string.alphanumeric(8)}.stl`,
        //       fileSize: faker.number.int({ min: 500000, max: 10000000 }),
        //       dimensions: {
        //         length: faker.number.int({ min: 10, max: 500 }),
        //         width: faker.number.int({ min: 10, max: 500 }),
        //         height: faker.number.int({ min: 10, max: 500 }),
        //         unit: "mm",
        //       },
        //     }
        //   : undefined,
        // Image seeding disabled.
        images: [],
        specialRequirements: faker.lorem.paragraph(),
        budget: faker.number.int({ min: 10000, max: 500000 }),
        status: "submitted",
      });
      customOrders.push(customOrder);
    }
  }

  console.log(`✓ Created ${customOrders.length} custom orders`);
  return customOrders;
}

// ============================================================================
// 5. CREATE RFQs
// ============================================================================

async function createRFQs(customOrders) {
  console.log("Creating RFQs...");
  const rfqs = [];

  // Select a subset of custom orders to become RFQs
  const rfqOrders = customOrders.filter(() =>
    randomBool(CONFIG.RFQS_PERCENTAGE),
  );

  for (const customOrder of rfqOrders) {
    const duration = faker.number.int({ min: 48, max: 336 }); // 2-14 days in hours
    const startDate = faker.date.recent({ days: 30 });
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    const isActive = endDate > new Date();

    const rfq = await RFQ.create({
      customOrderId: customOrder._id,
      customerId: customOrder.customerId,
      duration,
      startDate,
      endDate,
      status: isActive ? "active" : "closed",
      minBidThreshold: customOrder.budget
        ? customOrder.budget * 0.7
        : undefined,
      broadcastToAll: randomBool(0.8),
      bidsCount: 0, // Will be updated when creating bids
    });
    rfqs.push(rfq);

    // Update custom order status
    await CustomOrder.findByIdAndUpdate(customOrder._id, {
      status: "rfq_created",
      rfqId: rfq._id,
    });
  }

  console.log(`✓ Created ${rfqs.length} RFQs`);
  return rfqs;
}

// ============================================================================
// 6. CREATE BIDS
// ============================================================================

async function createBids(rfqs, manufacturers) {
  console.log("Creating bids...");
  const bids = [];

  // Only verified manufacturers can bid
  const verifiedManufacturers = manufacturers.filter(
    (m) => m.verificationStatus === "verified",
  );

  for (const rfq of rfqs) {
    const customOrder = await CustomOrder.findById(rfq.customOrderId);
    const bidCount = faker.number.int({ min: 2, max: CONFIG.BIDS_PER_RFQ });

    // Select random manufacturers for this RFQ
    const biddingManufacturers = randomSubset(
      verifiedManufacturers,
      bidCount,
      bidCount,
    );

    for (const manufacturer of biddingManufacturers) {
      const amount = faker.number.int({
        min: customOrder.budget * 0.7,
        max: customOrder.budget * 1.3,
      });

      const materials = amount * 0.4;
      const labor = amount * 0.3;
      const overhead = amount * 0.15;
      const profit = amount * 0.15;

      const bid = await Bid.create({
        rfqId: rfq._id,
        manufacturerId: manufacturer._id,
        amount,
        costBreakdown: { materials, labor, overhead, profit },
        timeline: faker.number.int({ min: 7, max: 60 }),
        proposedMilestones: [
          {
            name: "Design Approval",
            duration: faker.number.int({ min: 2, max: 5 }),
            description: "Review and finalize design specifications",
          },
          {
            name: "Production",
            duration: faker.number.int({ min: 7, max: 30 }),
            description: "Manufacturing phase",
          },
          {
            name: "Quality Check",
            duration: faker.number.int({ min: 2, max: 5 }),
            description: "Final quality inspection",
          },
        ],
        materialsDescription: faker.lorem.paragraph(),
        processDescription: faker.lorem.paragraph(),
        paymentTerms: "50% upfront, 50% on delivery",
        warrantyInfo: "6 months manufacturing defect warranty",
        status: randomBool(0.3)
          ? "under_consideration"
          : randomBool(0.1)
            ? "accepted"
            : "pending",
        markedForConsideration: randomBool(0.3),
        submittedAt: faker.date.between({
          from: rfq.startDate,
          to: new Date(),
        }),
      });
      bids.push(bid);
    }

    // Update RFQ bids count
    await RFQ.findByIdAndUpdate(rfq._id, {
      bidsCount: biddingManufacturers.length,
    });
  }

  console.log(`✓ Created ${bids.length} bids`);
  return bids;
}

// ============================================================================
// 7. CREATE GROUP BUYS
// ============================================================================

async function createGroupBuys(manufacturers, products) {
  console.log("Creating group buys...");
  const groupBuys = [];

  // Only verified manufacturers can create group buys
  const verifiedManufacturers = manufacturers.filter(
    (m) => m.verificationStatus === "verified",
  );

  for (const manufacturer of verifiedManufacturers) {
    const manufacturerProducts = products.filter(
      (p) =>
        p.manufacturerId.toString() === manufacturer._id.toString() &&
        p.status === "active",
    );

    if (manufacturerProducts.length === 0) continue;

    const gbCount = faker.number.int({
      min: 0,
      max: CONFIG.GROUP_BUYS_PER_MANUFACTURER,
    });

    for (let i = 0; i < gbCount; i++) {
      const product = randomItem(manufacturerProducts);
      const basePrice = product.price;

      const startDate = faker.date.recent({ days: 10 });
      const endDate = faker.date.soon({ days: 20, refDate: startDate });
      const now = new Date();

      let status;
      if (now < startDate) status = "scheduled";
      else if (now >= startDate && now < endDate) status = "active";
      else status = randomBool(0.7) ? "completed" : "cancelled";

      const tiers = [
        {
          tierNumber: 1,
          minQuantity: 50,
          discountPercent: 10,
          discountedPrice: basePrice * 0.9,
        },
        {
          tierNumber: 2,
          minQuantity: 100,
          discountPercent: 15,
          discountedPrice: basePrice * 0.85,
        },
        {
          tierNumber: 3,
          minQuantity: 200,
          discountPercent: 20,
          discountedPrice: basePrice * 0.8,
        },
      ];

      const groupBuy = await GroupBuy.create({
        manufacturerId: manufacturer._id,
        productId: product._id,
        title: `Group Buy: ${product.name}`,
        description: `Limited time group buy for ${product.name}. Higher quantities unlock better discounts!`,
        basePrice,
        tiers,
        minParticipants: 5,
        maxParticipants: randomBool(0.5)
          ? faker.number.int({ min: 50, max: 200 })
          : undefined,
        startDate,
        endDate,
        status,
        participants: [],
        currentQuantity: 0,
        currentParticipantCount: 0,
        currentTierIndex: -1,
        currentDiscountedPrice: basePrice,
        completedAt: status === "completed" ? endDate : null,
        cancelledAt: status === "cancelled" ? endDate : null,
        cancelReason:
          status === "cancelled"
            ? "Minimum participants not reached"
            : undefined,
      });

      groupBuys.push(groupBuy);
    }
  }

  console.log(`✓ Created ${groupBuys.length} group buys`);
  return groupBuys;
}

// ============================================================================
// 8. CREATE ORDERS
// ============================================================================

async function createOrders(customers, manufacturers, products, rfqs, bids) {
  console.log("Creating orders...");
  const orders = [];

  for (const customer of customers) {
    const orderCount = faker.number.int({
      min: 1,
      max: CONFIG.ORDERS_PER_CUSTOMER,
    });

    for (let i = 0; i < orderCount; i++) {
      const orderType = randomItem(["product", "rfq"]);

      let order;
      if (orderType === "product") {
        // Regular product order
        const product = randomItem(
          products.filter((p) => p.status === "active"),
        );
        const manufacturer = manufacturers.find(
          (m) => m._id.toString() === product.manufacturerId.toString(),
        );

        const quantity = faker.number.int({
          min: product.moq,
          max: product.moq * 5,
        });
        const unitPrice = product.price;
        const totalPrice = unitPrice * quantity;

        const statuses = [
          "pending_acceptance",
          "accepted",
          "in_production",
          "shipped",
          "completed",
        ];
        const status = randomItem(statuses);

        order = await Order.create({
          customerId: customer._id,
          manufacturerId: manufacturer._id,
          orderType: "product",
          productId: product._id,
          productDetails: {
            name: product.name,
            description: product.description,
            specifications: product.specifications,
          },
          quantity,
          unitPrice,
          totalPrice,
          status,
          paymentStatus:
            status === "pending_acceptance" ? "authorized" : "captured",
          paymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
          deliveryAddress: customer.savedAddresses[0],
          estimatedDeliveryDate: faker.date.future(),
          manufacturerAcceptedAt:
            status !== "pending_acceptance" ? faker.date.recent() : null,
          milestones:
            status === "in_production" ||
            status === "shipped" ||
            status === "completed"
              ? [
                  {
                    name: "Order Confirmed",
                    status: "completed",
                    completedAt: faker.date.recent(),
                  },
                  {
                    name: "In Production",
                    status:
                      status === "in_production" ||
                      status === "shipped" ||
                      status === "completed"
                        ? "completed"
                        : "pending",
                    completedAt:
                      status === "in_production" ||
                      status === "shipped" ||
                      status === "completed"
                        ? faker.date.recent()
                        : null,
                  },
                  {
                    name: "Quality Check",
                    status:
                      status === "shipped" || status === "completed"
                        ? "completed"
                        : "pending",
                    completedAt:
                      status === "shipped" || status === "completed"
                        ? faker.date.recent()
                        : null,
                  },
                ]
              : [],
          trackingNumber:
            status === "shipped" || status === "completed"
              ? faker.string.alphanumeric(12).toUpperCase()
              : null,
          completedAt: status === "completed" ? faker.date.recent() : null,
        });
      } else {
        // RFQ order from accepted bid
        const acceptedBids = bids.filter((b) => b.status === "accepted");
        if (acceptedBids.length === 0) continue;

        const bid = randomItem(acceptedBids);
        const rfq = rfqs.find((r) => r._id.toString() === bid.rfqId.toString());
        const customOrder = await CustomOrder.findById(rfq.customOrderId);

        const statuses = ["accepted", "in_production", "shipped", "completed"];
        const status = randomItem(statuses);

        order = await Order.create({
          customerId: customer._id,
          manufacturerId: bid.manufacturerId,
          orderType: "rfq",
          rfqId: rfq._id,
          bidId: bid._id,
          productDetails: {
            name: customOrder.title,
            description: customOrder.description,
          },
          quantity: customOrder.quantity,
          agreedPrice: bid.amount,
          totalPrice: bid.amount,
          timeline: bid.timeline,
          status,
          paymentStatus: "captured",
          paymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
          deliveryAddress: customer.savedAddresses[0],
          estimatedDeliveryDate: faker.date.future(),
          manufacturerAcceptedAt: faker.date.recent(),
          // 3D design file seeding disabled.
          designFiles: [],
          milestones: bid.proposedMilestones.map((m, idx) => ({
            name: m.name,
            description: m.description,
            status: idx === 0 ? "completed" : "pending",
            completedAt: idx === 0 ? faker.date.recent() : null,
          })),
          trackingNumber:
            status === "shipped" || status === "completed"
              ? faker.string.alphanumeric(12).toUpperCase()
              : null,
          completedAt: status === "completed" ? faker.date.recent() : null,
        });

        // Update RFQ and custom order
        await RFQ.findByIdAndUpdate(rfq._id, {
          status: "bid_accepted",
          acceptedBidId: bid._id,
          closedAt: new Date(),
        });
        await CustomOrder.findByIdAndUpdate(customOrder._id, {
          status: "order_placed",
        });
      }

      orders.push(order);
    }
  }

  console.log(`✓ Created ${orders.length} orders`);
  return orders;
}

// ============================================================================
// 9. CREATE REVIEWS
// ============================================================================

async function createReviews(orders) {
  console.log("Creating reviews...");
  const reviews = [];

  const completedOrders = orders.filter((o) => o.status === "completed");
  const reviewOrders = completedOrders.filter(() =>
    randomBool(CONFIG.REVIEWS_PERCENTAGE),
  );

  for (const order of reviewOrders) {
    const overallRating = faker.number.int({ min: 3, max: 5 });
    const review = await Review.create({
      orderId: order._id,
      customerId: order.customerId,
      manufacturerId: order.manufacturerId,
      productId: order.productId,
      overallRating,
      qualityRating: faker.number.int({ min: overallRating - 1, max: 5 }),
      communicationRating: faker.number.int({ min: overallRating - 1, max: 5 }),
      deliveryRating: faker.number.int({ min: overallRating - 1, max: 5 }),
      title: faker.lorem.sentence(),
      comment: faker.lorem.paragraph(),
      recommended: overallRating >= 4,
      manufacturerResponse: randomBool(0.5)
        ? {
            comment: faker.lorem.paragraph(),
            respondedAt: faker.date.recent(),
          }
        : undefined,
    });
    reviews.push(review);

    // Update order
    await Order.findByIdAndUpdate(order._id, {
      reviewId: review._id,
      reviewed: true,
    });
  }

  console.log(`✓ Created ${reviews.length} reviews`);
  return reviews;
}

// ============================================================================
// 10. CREATE DISPUTES
// ============================================================================

async function createDisputes(orders, admins) {
  console.log("Creating disputes...");
  const disputes = [];

  const disputeOrders = orders
    .filter((o) => ["in_production", "shipped", "completed"].includes(o.status))
    .filter(() => randomBool(CONFIG.DISPUTES_PERCENTAGE));

  for (const order of disputeOrders) {
    const issueTypes = [
      "quality_issue",
      "late_delivery",
      "item_not_as_described",
      "damaged_item",
    ];
    const resolutions = [
      "refund_customer",
      "side_with_manufacturer",
      "partial_resolution",
    ];

    const isResolved = randomBool(0.6);
    const resolution = isResolved ? randomItem(resolutions) : null;

    const dispute = await Dispute.create({
      orderId: order._id,
      customerId: order.customerId,
      manufacturerId: order.manufacturerId,
      issueType: randomItem(issueTypes),
      description: faker.lorem.paragraphs(2),
      desiredResolution: randomItem([
        "full_refund",
        "partial_refund",
        "replacement",
      ]),
      // Image evidence seeding disabled.
      customerEvidence: [],
      manufacturerResponse: randomBool(0.7)
        ? {
            comment: faker.lorem.paragraph(),
            // Image evidence seeding disabled.
            evidence: [],
            respondedAt: faker.date.recent(),
          }
        : undefined,
      status: isResolved
        ? "resolved"
        : randomBool(0.5)
          ? "manufacturer_responded"
          : "open",
      resolution,
      resolutionAmount:
        resolution === "refund_customer"
          ? order.totalPrice
          : resolution === "partial_resolution"
            ? order.totalPrice * 0.5
            : null,
      resolutionMessage: isResolved ? faker.lorem.sentence() : null,
      resolvedBy: isResolved ? randomItem(admins)._id : null,
      resolvedAt: isResolved ? faker.date.recent() : null,
      adminNotes: isResolved ? faker.lorem.paragraph() : null,
    });
    disputes.push(dispute);

    // Update order status if dispute is open
    if (!isResolved) {
      await Order.findByIdAndUpdate(order._id, { status: "disputed" });
    }
  }

  console.log(`✓ Created ${disputes.length} disputes`);
  return disputes;
}

// ============================================================================
// 11. CREATE CHATS & MESSAGES
// ============================================================================

async function createChatsAndMessages(bids, orders) {
  console.log("Creating chats and messages...");
  const conversations = [];
  const messages = [];

  // Chat for bids (customer + manufacturer)
  const bidsWithChat = bids.filter(() => randomBool(0.4));
  for (const bid of bidsWithChat) {
    const rfq = await RFQ.findById(bid.rfqId);

    const conversation = await Chat.create({
      participants: [rfq.customerId, bid.manufacturerId],
      contextType: "bid",
      contextId: bid._id,
    });
    conversations.push(conversation);

    // Create messages
    const msgCount = faker.number.int({
      min: 2,
      max: CONFIG.MESSAGES_PER_CONVERSATION,
    });
    for (let i = 0; i < msgCount; i++) {
      const isCustomer = i % 2 === 0;
      const senderId = isCustomer ? rfq.customerId : bid.manufacturerId;

      const message = await ChatMessage.create({
        conversationId: conversation._id,
        senderId,
        senderRole: isCustomer ? "customer" : "manufacturer",
        senderName: faker.person.fullName(),
        message: faker.lorem.sentence(),
      });
      messages.push(message);
    }

    // Update conversation last message
    const lastMsg = messages[messages.length - 1];
    await Chat.findByIdAndUpdate(conversation._id, {
      lastMessage: {
        text: lastMsg.message,
        senderId: lastMsg.senderId,
        sentAt: lastMsg.createdAt,
      },
    });
  }

  // Chat for orders (customer + manufacturer)
  const ordersWithChat = orders.filter(() => randomBool(0.5));
  for (const order of ordersWithChat) {
    const conversation = await Chat.create({
      participants: [order.customerId, order.manufacturerId],
      contextType: "order",
      contextId: order._id,
    });
    conversations.push(conversation);

    const msgCount = faker.number.int({
      min: 3,
      max: CONFIG.MESSAGES_PER_CONVERSATION,
    });
    for (let i = 0; i < msgCount; i++) {
      const isCustomer = i % 2 === 0;
      const senderId = isCustomer ? order.customerId : order.manufacturerId;

      const message = await ChatMessage.create({
        conversationId: conversation._id,
        senderId,
        senderRole: isCustomer ? "customer" : "manufacturer",
        senderName: faker.person.fullName(),
        message: faker.lorem.sentence(),
      });
      messages.push(message);
    }

    const lastMsg = messages[messages.length - 1];
    await Chat.findByIdAndUpdate(conversation._id, {
      lastMessage: {
        text: lastMsg.message,
        senderId: lastMsg.senderId,
        sentAt: lastMsg.createdAt,
      },
    });
  }

  console.log(
    `✓ Created ${conversations.length} conversations with ${messages.length} messages`,
  );
  return { conversations, messages };
}

// ============================================================================
// 12. CREATE NOTIFICATIONS
// ============================================================================

async function createNotifications(customers, manufacturers, orders, bids) {
  console.log("Creating notifications...");
  const notifications = [];

  // Order notifications
  for (const order of orders) {
    // Notify manufacturer
    notifications.push(
      await Notification.create({
        userId: order.manufacturerId,
        type: "order_placed",
        title: "New Order Received",
        message: `You have received a new order #${order.orderNumber}`,
        link: `/manufacturer/orders/${order._id}`,
        relatedType: "order",
        relatedId: order._id,
        isRead: randomBool(0.7),
      }),
    );

    // Notify customer on status changes
    if (order.status === "accepted") {
      notifications.push(
        await Notification.create({
          userId: order.customerId,
          type: "order_accepted",
          title: "Order Accepted",
          message: `Your order #${order.orderNumber} has been accepted`,
          link: `/customer/orders/${order._id}`,
          relatedType: "order",
          relatedId: order._id,
          isRead: randomBool(0.7),
        }),
      );
    }
  }

  // Bid notifications
  for (const bid of bids) {
    const rfq = await RFQ.findById(bid.rfqId);
    notifications.push(
      await Notification.create({
        userId: rfq.customerId,
        type: "bid_received",
        title: "New Bid Received",
        message: `You have received a new bid for RFQ #${rfq.rfqNumber}`,
        link: `/customer/rfqs/${rfq._id}/bids`,
        relatedType: "bid",
        relatedId: bid._id,
        isRead: randomBool(0.6),
      }),
    );
  }

  console.log(`✓ Created ${notifications.length} notifications`);
  return notifications;
}

// ============================================================================
// 13. CREATE ADMIN LOGS
// ============================================================================

async function createAdminLogs(admins, manufacturers, disputes) {
  console.log("Creating admin logs...");
  const logs = [];

  // Verification logs
  for (const manufacturer of manufacturers) {
    if (manufacturer.verificationStatus === "verified") {
      logs.push(
        await AdminLog.create({
          adminId: randomItem(admins)._id,
          action: "manufacturer_approved",
          targetType: "manufacturer",
          targetId: manufacturer._id,
          description: `Approved manufacturer: ${manufacturer.businessName}`,
          details: "All documents verified successfully",
        }),
      );
    }
  }

  // Dispute resolution logs
  for (const dispute of disputes.filter((d) => d.status === "resolved")) {
    logs.push(
      await AdminLog.create({
        adminId: randomItem(admins)._id,
        action: "dispute_resolved",
        targetType: "dispute",
        targetId: dispute._id,
        description: `Resolved dispute ${dispute.disputeNumber}`,
        details: `Resolution: ${dispute.resolution}`,
      }),
    );
  }

  console.log(`✓ Created ${logs.length} admin logs`);
  return logs;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seed...\n");

    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not set. Run: node --env-file=.env.local scripts/seedDatabase.js",
      );
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Clear existing data
    console.log("Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      ProductQuestion.deleteMany({}),
      CustomOrder.deleteMany({}),
      RFQ.deleteMany({}),
      Bid.deleteMany({}),
      Order.deleteMany({}),
      GroupBuy.deleteMany({}),
      Review.deleteMany({}),
      Dispute.deleteMany({}),
      Notification.deleteMany({}),
      AdminLog.deleteMany({}),
      VerificationDocument.deleteMany({}),
      Chat.deleteMany({}),
      ChatMessage.deleteMany({}),
      SupportTicket.deleteMany({}),
      SupportTicketMessage.deleteMany({}),
    ]);
    console.log("✓ Cleared existing data\n");

    // Seed in order (respecting dependencies)
    const users = await createUsers();
    await createVerificationDocuments(users.manufacturers, users.admins);
    const products = await createProducts(users.manufacturers);
    const customOrders = await createCustomOrders(users.customers);
    const rfqs = await createRFQs(customOrders);
    const bids = await createBids(rfqs, users.manufacturers);
    const groupBuys = await createGroupBuys(users.manufacturers, products);
    const orders = await createOrders(
      users.customers,
      users.manufacturers,
      products,
      rfqs,
      bids,
    );
    await createReviews(orders);
    const disputes = await createDisputes(orders, users.admins);
    await createChatsAndMessages(bids, orders);
    await createNotifications(
      users.customers,
      users.manufacturers,
      orders,
      bids,
    );
    await createAdminLogs(users.admins, users.manufacturers, disputes);

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Admins: ${users.admins.length}`);
    console.log(`   Customers: ${users.customers.length}`);
    console.log(`   Manufacturers: ${users.manufacturers.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Custom Orders: ${customOrders.length}`);
    console.log(`   RFQs: ${rfqs.length}`);
    console.log(`   Bids: ${bids.length}`);
    console.log(`   Group Buys: ${groupBuys.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log(`   Disputes: ${disputes.length}`);

    console.log("\n🔐 Default Credentials:");
    console.log("   Admin: admin1@craftit.com / Admin123!");
    console.log("   Any customer email / Customer123!");
    console.log("   Any manufacturer email / Manufacturer123!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed
seedDatabase();
