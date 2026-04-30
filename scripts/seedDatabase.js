// scripts/seedDatabase.js
// Run with: node --env-file=.env.local scripts/seedDatabase.js

import mongoose from "mongoose";
import { faker } from "@faker-js/faker";

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
import { CUSTOMIZATION_TYPE_IDS } from "../lib/customization.js";

// ============================================================================
// FIXED ACCOUNT CREDENTIALS
// ============================================================================
const FIXED = {
  admin: { email: "admin@craftit.com", password: "Admin123!" },
  customer: { email: "customer@craftit.com", password: "Customer123!" },
  manufacturer: {
    email: "manufacturer@craftit.com",
    password: "Manufacturer123!",
  },
};

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  EXTRA_CUSTOMERS: 20,
  EXTRA_MANUFACTURERS: 12,
  PRODUCTS_PER_MANUFACTURER: { min: 4, max: 8 },
  CUSTOM_ORDERS_PER_CUSTOMER: { min: 2, max: 4 },
  RFQS_PERCENTAGE: 0.65,
  BIDS_PER_RFQ: { min: 2, max: 5 },
  GROUP_BUYS_PER_MANUFACTURER: { min: 1, max: 3 },
  ORDERS_PER_CUSTOMER: { min: 3, max: 6 },
  REVIEWS_PERCENTAGE: 0.75,
  DISPUTES_PERCENTAGE: 0.12,
  MESSAGES_PER_CONVERSATION: { min: 4, max: 14 },
  NOTIFICATIONS_PER_USER: { min: 3, max: 8 },
  QUESTIONS_PER_PRODUCT: { min: 0, max: 4 },
  SUPPORT_TICKETS_PER_USER: { min: 0, max: 2 },
};

// ============================================================================
// HELPERS
// ============================================================================
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomSubset = (arr, min = 1, max = 3) => {
  const count = faker.number.int({ min, max: Math.min(max, arr.length) });
  return faker.helpers.arrayElements(arr, count);
};
const randomBool = (probability = 0.5) => Math.random() < probability;
const randomInt = (min, max) => faker.number.int({ min, max });

// ============================================================================
// DATA POOLS
// ============================================================================
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
  "Textiles",
  "Construction",
  "Agriculture",
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

// Placeholder image services - fast, free, reliable
const productImageSeeds = [
  "industrial",
  "factory",
  "metal",
  "machinery",
  "electronics",
  "automotive",
  "tools",
  "packaging",
  "furniture",
  "medical",
];

function productImages(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    url: `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/600`,
    isPrimary: i === 0,
  }));
}

function avatarUrl(seed) {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
}

function businessLogoUrl(seed) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

const productNames = [
  "Precision CNC Bracket",
  "Aluminum Extrusion Profile",
  "Injection Molded Housing",
  "Stainless Steel Fastener Set",
  "Copper Heat Sink",
  "Carbon Fiber Panel",
  "Industrial Gear Assembly",
  "Sheet Metal Enclosure",
  "Rubber Seal Kit",
  "Titanium Bolt Set",
  "Brass Fitting Connector",
  "Polycarbonate Cover",
  "Steel Welded Frame",
  "Anodized Aluminum Plate",
  "Custom PCB Enclosure",
  "Heavy Duty Hinge Set",
  "Precision Turned Parts",
  "Plastic Injection Component",
  "Medical Grade Container",
  "Automotive Bracket Kit",
  "Textile Carry Bag",
  "Wooden Packing Crate",
  "Glass Display Panel",
  "Foam Packaging Insert",
  "Powder Coated Steel Shelf",
];

const productDescriptions = [
  "High-precision component manufactured to ISO 9001 standards. Suitable for industrial applications requiring tight tolerances.",
  "Premium quality part with excellent corrosion resistance. Ideal for harsh environments and demanding use cases.",
  "Custom manufactured to specifications. Our in-house quality team ensures every unit meets exact requirements.",
  "Bulk-production ready component with consistent quality across all units. Available for immediate dispatch.",
  "Engineered for durability and long service life. Compatible with standard industry fittings and assemblies.",
];

// Chat message pools
const customerMessages = [
  "Hello, I'm interested in this product. Can you tell me more about the lead time?",
  "We need this in quantity of 500 units. Is there a bulk discount available?",
  "Can you share the quality certification documents for this product?",
  "What is the minimum order quantity for custom branding?",
  "We'd like to proceed with the order. Please confirm the delivery timeline.",
  "Can you provide samples before we commit to the full order?",
  "We need slight modifications to the dimensions. Is that possible?",
  "Please share a detailed quotation including all charges.",
  "Can we schedule a call to discuss the requirements in detail?",
  "Thank you for the quick response! We'll review and get back to you.",
  "Could you expedite the production? We have an urgent requirement.",
  "The samples look great! Let's proceed with the full order.",
];

const manufacturerMessages = [
  "Thank you for your inquiry! Our standard lead time is 15-20 working days.",
  "Yes, we offer bulk discounts for orders above 500 units. I'll share the pricing sheet.",
  "Certainly! I'll email you our ISO 9001 and other certifications right away.",
  "Our MOQ for custom branding is 200 units. We use screen printing and laser engraving.",
  "Confirmed! We can deliver within 3 weeks from payment clearance.",
  "We can arrange samples within 5-7 days. There's a nominal sample charge.",
  "Yes, we can accommodate dimension changes. Please share your technical drawing.",
  "Please find the detailed quotation attached. Let me know if you have questions.",
  "Absolutely! We can schedule a video call at your convenience.",
  "Looking forward to your response. Feel free to reach out anytime.",
  "We can expedite for an additional 15% rush charge. Shall we proceed?",
  "Excellent! I'll initiate the production order and keep you updated.",
];

// ============================================================================
// 0. CREATE FIXED ACCOUNTS
// ============================================================================
async function createFixedAccounts() {
  console.log("Creating fixed accounts...");

  // Admin
  const admin = await User.create({
    email: FIXED.admin.email,
    password: FIXED.admin.password,
    role: "admin",
    name: "Super Admin",
    phone: "+92 300 0000000",
    profilePicture: avatarUrl("admin-craftit"),
    verificationStatus: "verified",
    isEmailVerified: true,
    emailVerifiedAt: new Date("2024-01-01"),
    isActive: true,
  });

  // Fixed Customer
  const customer = await User.create({
    email: FIXED.customer.email,
    password: FIXED.customer.password,
    role: "customer",
    name: "Ahmed Khan",
    phone: "+92 321 1234567",
    profilePicture: avatarUrl("ahmed-khan-customer"),
    location: {
      city: "Lahore",
      state: "Punjab",
      country: "Pakistan",
      coordinates: { lat: 31.5204, lng: 74.3587 },
    },
    verificationStatus: "verified",
    isEmailVerified: true,
    emailVerifiedAt: new Date("2024-01-15"),
    isActive: true,
    savedAddresses: [
      {
        label: "Home",
        name: "Ahmed Khan",
        street: "House 12, Block C, Gulberg III",
        city: "Lahore",
        state: "Punjab",
        country: "Pakistan",
        postalCode: "54660",
        phone: "+92 321 1234567",
        isDefault: true,
      },
      {
        label: "Office",
        name: "Ahmed Khan",
        street: "Office 5, DHA Phase 6",
        city: "Lahore",
        state: "Punjab",
        country: "Pakistan",
        postalCode: "54810",
        phone: "+92 321 1234567",
        isDefault: false,
      },
    ],
    stats: {
      totalOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  });

  // Fixed Manufacturer
  const manufacturer = await User.create({
    email: FIXED.manufacturer.email,
    password: FIXED.manufacturer.password,
    role: "manufacturer",
    name: "Usman Tariq",
    phone: "+92 333 9876543",
    profilePicture: avatarUrl("usman-tariq-manufacturer"),
    businessName: "TechForge Industries",
    contactPerson: "Usman Tariq",
    businessEmail: "info@techforge.pk",
    businessPhone: "+92 42 35761234",
    businessType: "private_limited",
    businessDescription:
      "TechForge Industries is a leading precision manufacturing company based in Faisalabad, specializing in CNC machining, sheet metal fabrication, and custom industrial components. With over 10 years of experience, we serve clients across Pakistan and internationally.",
    businessRegistrationNumber: "TFI-2014-PVT-0821",
    businessLogo: businessLogoUrl("TechForge-Industries"),
    businessBanner: `https://picsum.photos/seed/techforge-banner/1200/400`,
    location: {
      city: "Faisalabad",
      state: "Punjab",
      country: "Pakistan",
      coordinates: { lat: 31.4181, lng: 73.0776 },
    },
    businessAddress: {
      street: "Plot 45, Industrial Estate, Millat Road",
      city: "Faisalabad",
      state: "Punjab",
      country: "Pakistan",
      postalCode: "38000",
    },
    manufacturingCapabilities: [
      "CNC_Machining",
      "Sheet_Metal",
      "Welding",
      "Assembly",
      "Finishing",
      "Prototyping",
    ],
    materialsAvailable: ["Steel", "Aluminum", "Copper", "Brass", "Titanium"],
    minOrderQuantity: 50,
    certifications: ["ISO 9001:2015", "PSQCA Certified"],
    verificationStatus: "verified",
    isEmailVerified: true,
    emailVerifiedAt: new Date("2024-01-10"),
    isActive: true,
    verifiedAt: new Date("2024-02-01"),
    stats: {
      totalOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  });

  console.log(`✓ Created fixed admin, customer, and manufacturer accounts`);
  return { admin, customer, manufacturer };
}

// ============================================================================
// 1. CREATE EXTRA USERS
// ============================================================================
async function createExtraUsers(fixedAdmin) {
  console.log("Creating extra users...");
  const customers = [];
  const manufacturers = [];

  for (let i = 0; i < CONFIG.EXTRA_CUSTOMERS; i++) {
    const location = randomItem(pakistanCities);
    const customer = await User.create({
      email: faker.internet.email().toLowerCase(),
      password: "Customer123!",
      role: "customer",
      name: faker.person.fullName(),
      phone: faker.phone.number("+92 3## #######"),
      profilePicture: avatarUrl(faker.string.alphanumeric(10)),
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
      emailVerifiedAt: faker.date.past({ years: 1 }),
      isActive: true,
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
      stats: {
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
      },
    });
    customers.push(customer);
  }

  for (let i = 0; i < CONFIG.EXTRA_MANUFACTURERS; i++) {
    const location = randomItem(pakistanCities);
    const isVerified = randomBool(0.8);
    const bizName = faker.company.name();
    const manufacturer = await User.create({
      email: faker.internet.email().toLowerCase(),
      password: "Manufacturer123!",
      role: "manufacturer",
      name: faker.person.fullName(),
      phone: faker.phone.number("+92 3## #######"),
      profilePicture: avatarUrl(faker.string.alphanumeric(10)),
      businessName: bizName,
      contactPerson: faker.person.fullName(),
      businessEmail: faker.internet.email().toLowerCase(),
      businessPhone: faker.phone.number("+92 4# #######"),
      businessType: randomItem(businessTypes),
      businessDescription:
        faker.company.catchPhrase() + ". " + faker.lorem.sentence(),
      businessRegistrationNumber: faker.string.alphanumeric(10).toUpperCase(),
      businessLogo: businessLogoUrl(bizName),
      businessBanner: `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/1200/400`,
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
      manufacturingCapabilities: randomSubset(capabilities, 2, 6),
      materialsAvailable: randomSubset(materials, 3, 7),
      minOrderQuantity: randomInt(10, 500),
      certifications: randomBool(0.6)
        ? randomSubset(
            ["ISO 9001:2015", "ISO 14001", "PSQCA Certified", "CE Marked"],
            1,
            2,
          )
        : [],
      verificationStatus: isVerified
        ? "verified"
        : randomItem(["unverified", "unverified", "suspended"]),
      isEmailVerified: true,
      emailVerifiedAt: faker.date.past({ years: 1 }),
      isActive: true,
      verifiedAt: isVerified ? faker.date.past({ years: 1 }) : null,
      verifiedBy: isVerified ? fixedAdmin._id : null,
      stats: {
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
      },
    });
    manufacturers.push(manufacturer);
  }

  console.log(
    `✓ Created ${customers.length} extra customers and ${manufacturers.length} extra manufacturers`,
  );
  return { customers, manufacturers };
}

// ============================================================================
// 2. CREATE VERIFICATION DOCUMENTS
// ============================================================================
async function createVerificationDocuments(allManufacturers, admin) {
  console.log("Creating verification documents...");
  const docs = [];
  const docTypes = [
    "ntn_certificate",
    "secp_form_c",
    "chamber_certificate",
    "business_license",
  ];

  for (const manufacturer of allManufacturers) {
    const isVerified = manufacturer.verificationStatus === "verified";
    const isResubmission =
      manufacturer.verificationStatus === "unverified" && randomBool(0.3);

    const documents = randomSubset(docTypes, 2, 4).map((type) => ({
      type,
      url: `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/1000`,
      filename: `${type}_${faker.string.alphanumeric(8)}.pdf`,
      fileSize: randomInt(150000, 4000000),
      uploadedAt: faker.date.past({ years: 1 }),
    }));

    const verificationDoc = await VerificationDocument.create({
      manufacturerId: manufacturer._id,
      ntnNumber: faker.string.numeric(7),
      strnNumber: faker.string.numeric(10),
      secpRegistrationNumber: faker.string.alphanumeric(12).toUpperCase(),
      documents,
      verificationStatus: isVerified
        ? "verified"
        : isResubmission
          ? "resubmission_required"
          : "pending",
      reviewedBy: isVerified ? admin._id : null,
      reviewNotes: isVerified ? "All documents are valid and verified." : null,
      rejectionReason: isResubmission
        ? "NTN certificate is expired. Please resubmit."
        : null,
      reviewedAt: isVerified ? faker.date.past({ years: 1 }) : null,
      resubmissionCount: isResubmission ? randomInt(1, 2) : 0,
    });
    docs.push(verificationDoc);
  }

  console.log(`✓ Created ${docs.length} verification documents`);
  return docs;
}

// ============================================================================
// 3. CREATE PRODUCTS FOR FIXED MANUFACTURER
// ============================================================================
async function createFixedManufacturerProducts(fixedManufacturer) {
  console.log("Creating fixed manufacturer products...");
  const products = [];

  const fixedProductData = [
    {
      name: "CNC Precision Bracket",
      description:
        "High-precision CNC machined bracket made from aerospace-grade aluminum. Tolerances up to ±0.01mm. Perfect for industrial assemblies and mechanical fixtures.",
      category: "Industrial",
      subCategory: "Structural Components",
      price: 3500,
      moq: 50,
      stock: 450,
      images: [
        {
          url: "https://picsum.photos/seed/cnc-bracket-1/800/600",
          isPrimary: true,
        },
        {
          url: "https://picsum.photos/seed/cnc-bracket-2/800/600",
          isPrimary: false,
        },
        {
          url: "https://picsum.photos/seed/cnc-bracket-3/800/600",
          isPrimary: false,
        },
      ],
      specifications: {
        material: "Aluminum",
        dimensions: { length: 150, width: 80, height: 40, unit: "mm" },
        weight: 320,
        color: ["Silver", "Black"],
      },
      customizationOptions: true,
      customizationCapabilities: {
        allowedTypes: ["branding", "color", "dimensions"],
        minCustomizationQuantity: 100,
        notes:
          "Custom dimensions require technical drawing. Color anodizing available.",
      },
      leadTime: 14,
      tags: ["cnc", "precision", "aluminum", "industrial"],
      status: "active",
    },
    {
      name: "Sheet Metal Enclosure Box",
      description:
        "Powder-coated mild steel enclosure for electrical panels and control boxes. Available in RAL color options. IP54 rated. Custom cutouts available.",
      category: "Electronics",
      subCategory: "Enclosures",
      price: 8500,
      moq: 25,
      stock: 200,
      images: [
        {
          url: "https://picsum.photos/seed/enclosure-1/800/600",
          isPrimary: true,
        },
        {
          url: "https://picsum.photos/seed/enclosure-2/800/600",
          isPrimary: false,
        },
        {
          url: "https://picsum.photos/seed/enclosure-3/800/600",
          isPrimary: false,
        },
      ],
      specifications: {
        material: "Steel",
        dimensions: { length: 400, width: 300, height: 200, unit: "mm" },
        weight: 2500,
        color: ["Gray", "White", "Black"],
      },
      customizationOptions: true,
      customizationCapabilities: {
        allowedTypes: ["color", "dimensions", "finishing"],
        minCustomizationQuantity: 50,
        notes:
          "Custom cutouts and cable glands available. Please share panel layout drawings.",
      },
      leadTime: 21,
      tags: ["enclosure", "steel", "electrical", "ip54"],
      status: "active",
    },
    {
      name: "Stainless Steel Fastener Set (M8)",
      description:
        "Grade 316 stainless steel fastener set including bolts, nuts, and washers. Corrosion resistant. Suitable for marine and food-grade applications.",
      category: "Industrial",
      subCategory: "Fasteners",
      price: 1200,
      moq: 100,
      stock: 2000,
      images: [
        {
          url: "https://picsum.photos/seed/fastener-1/800/600",
          isPrimary: true,
        },
        {
          url: "https://picsum.photos/seed/fastener-2/800/600",
          isPrimary: false,
        },
      ],
      specifications: {
        material: "Steel",
        dimensions: { length: 40, width: 8, height: 8, unit: "mm" },
        weight: 50,
        color: ["Silver"],
      },
      customizationOptions: false,
      customizationCapabilities: { allowedTypes: [] },
      leadTime: 7,
      tags: ["fastener", "stainless-steel", "marine", "bulk"],
      status: "active",
    },
    {
      name: "Welded Steel Frame Assembly",
      description:
        "Heavy-duty welded steel frame for machinery bases and structural applications. MIG welded, sandblasted, and epoxy primed. Custom sizes available.",
      category: "Industrial",
      subCategory: "Structural Frames",
      price: 25000,
      moq: 10,
      stock: 80,
      images: [
        {
          url: "https://picsum.photos/seed/steel-frame-1/800/600",
          isPrimary: true,
        },
        {
          url: "https://picsum.photos/seed/steel-frame-2/800/600",
          isPrimary: false,
        },
        {
          url: "https://picsum.photos/seed/steel-frame-3/800/600",
          isPrimary: false,
        },
      ],
      specifications: {
        material: "Steel",
        dimensions: { length: 1200, width: 800, height: 900, unit: "mm" },
        weight: 45000,
        color: ["Gray", "Black"],
      },
      customizationOptions: true,
      customizationCapabilities: {
        allowedTypes: ["dimensions", "material", "finishing"],
        minCustomizationQuantity: 5,
        notes:
          "Provide engineering drawings for custom frame sizes. Welding inspection certificates available on request.",
      },
      leadTime: 30,
      tags: ["steel-frame", "welding", "structural", "heavy-duty"],
      status: "active",
    },
    {
      name: "Aluminum Heat Sink (Custom)",
      description:
        "Extruded aluminum heat sink for electronic cooling. Available in standard and custom fin configurations. Anodizing and machining services included.",
      category: "Electronics",
      subCategory: "Thermal Management",
      price: 2200,
      moq: 50,
      stock: 350,
      images: [
        {
          url: "https://picsum.photos/seed/heatsink-1/800/600",
          isPrimary: true,
        },
        {
          url: "https://picsum.photos/seed/heatsink-2/800/600",
          isPrimary: false,
        },
      ],
      specifications: {
        material: "Aluminum",
        dimensions: { length: 100, width: 60, height: 35, unit: "mm" },
        weight: 180,
        color: ["Silver", "Black"],
      },
      customizationOptions: true,
      customizationCapabilities: {
        allowedTypes: ["dimensions", "color", "branding"],
        minCustomizationQuantity: 100,
        notes:
          "Custom fin pitch and base thickness available. Black anodizing for better thermal emissivity.",
      },
      leadTime: 18,
      tags: ["heatsink", "aluminum", "electronics", "thermal"],
      status: "active",
    },
    {
      name: "Brass Hydraulic Fittings",
      description:
        "CNC turned brass hydraulic fittings with NPT and BSP threads. Pressure rated up to 500 bar. Used in hydraulic systems, pneumatics, and fluid control.",
      category: "Automotive",
      subCategory: "Hydraulic Components",
      price: 850,
      moq: 200,
      stock: 1500,
      images: [
        {
          url: "https://picsum.photos/seed/brass-fitting-1/800/600",
          isPrimary: true,
        },
        {
          url: "https://picsum.photos/seed/brass-fitting-2/800/600",
          isPrimary: false,
        },
      ],
      specifications: {
        material: "Brass",
        dimensions: { length: 35, width: 20, height: 20, unit: "mm" },
        weight: 85,
        color: ["Gold"],
      },
      customizationOptions: false,
      customizationCapabilities: { allowedTypes: [] },
      leadTime: 10,
      tags: ["brass", "hydraulic", "automotive", "fittings"],
      status: "active",
    },
  ];

  for (const data of fixedProductData) {
    const product = await Product.create({
      manufacturerId: fixedManufacturer._id,
      ...data,
      views: randomInt(50, 800),
      totalOrders: 0,
      averageRating: 0,
      totalReviews: 0,
    });
    products.push(product);
  }

  console.log(`✓ Created ${products.length} fixed manufacturer products`);
  return products;
}

// ============================================================================
// 4. CREATE EXTRA MANUFACTURERS' PRODUCTS
// ============================================================================
async function createExtraProducts(manufacturers) {
  console.log("Creating extra manufacturer products...");
  const products = [];

  for (const manufacturer of manufacturers) {
    const count = randomInt(
      CONFIG.PRODUCTS_PER_MANUFACTURER.min,
      CONFIG.PRODUCTS_PER_MANUFACTURER.max,
    );
    for (let i = 0; i < count; i++) {
      const category = randomItem(categories);
      const price = randomInt(500, 60000);
      const moq = randomInt(10, 500);
      const supportsCustomization = randomBool(0.4);
      const allowedCustomizationTypes = supportsCustomization
        ? randomSubset(CUSTOMIZATION_TYPE_IDS, 1, 4)
        : [];

      const product = await Product.create({
        manufacturerId: manufacturer._id,
        name: randomItem(productNames),
        description: randomItem(productDescriptions),
        category,
        subCategory: faker.commerce.department(),
        price,
        moq,
        stock: randomInt(0, 1200),
        images: productImages(randomInt(2, 4)),
        specifications: {
          material: randomItem(materials),
          dimensions: {
            length: randomInt(10, 600),
            width: randomInt(10, 600),
            height: randomInt(5, 400),
            unit: "mm",
          },
          weight: randomInt(50, 10000),
          color: randomSubset(
            ["Red", "Blue", "Green", "Black", "White", "Silver", "Gray"],
            1,
            3,
          ),
        },
        customizationOptions: supportsCustomization,
        customizationCapabilities: supportsCustomization
          ? {
              allowedTypes: allowedCustomizationTypes,
              minCustomizationQuantity: randomInt(moq, moq * 3),
              notes: randomItem([
                "Share branding guidelines before production.",
                "Color matching may require Pantone references.",
                "Dimensional changes reviewed per batch.",
                "Custom packaging artwork needed 10 days before production.",
              ]),
            }
          : { allowedTypes: [] },
        leadTime: randomInt(7, 60),
        tags: randomSubset(
          [
            "custom",
            "bulk",
            "industrial",
            "premium",
            "eco-friendly",
            "export-quality",
          ],
          1,
          3,
        ),
        views: randomInt(0, 600),
        totalOrders: 0,
        averageRating: 0,
        totalReviews: 0,
        status: randomBool(0.85)
          ? "active"
          : randomItem(["draft", "out_of_stock"]),
      });
      products.push(product);
    }
  }

  console.log(`✓ Created ${products.length} extra products`);
  return products;
}

// ============================================================================
// 5. CREATE PRODUCT QUESTIONS (including fixed accounts)
// ============================================================================
async function createProductQuestions(
  allProducts,
  fixedCustomer,
  fixedManufacturer,
  allCustomers,
) {
  console.log("Creating product questions...");
  const questions = [];

  // Fixed customer asks questions on fixed manufacturer's products
  const fixedMfgProducts = allProducts.filter(
    (p) => p.manufacturerId.toString() === fixedManufacturer._id.toString(),
  );

  const fixedQuestionsData = [
    {
      question:
        "Can you confirm the tolerance level for the CNC machined parts? We need ±0.005mm for our application.",
      answer:
        "Yes, we can achieve ±0.005mm tolerances on our 5-axis CNC machines. Please note this requires a precision grinding finish pass which adds 10% to the unit cost.",
    },
    {
      question: "Do you offer sample orders before we commit to the full MOQ?",
      answer:
        "Absolutely! We offer sample orders of 5-10 units at 2x the unit price to cover setup costs. Sample lead time is 7 working days.",
    },
    {
      question:
        "What surface finishes are available for the aluminum products?",
      answer:
        "We offer natural anodizing (silver), black anodizing, hard anodizing, powder coating, and brushed finish. Each has different price implications.",
    },
    {
      question: "What is the maximum quantity you can produce per month?",
      answer:
        "Our monthly capacity is approximately 5,000 units for standard parts and 1,500 units for complex machined components.",
    },
  ];

  for (
    let i = 0;
    i < fixedQuestionsData.length && i < fixedMfgProducts.length;
    i++
  ) {
    const product = fixedMfgProducts[i % fixedMfgProducts.length];
    const q = await ProductQuestion.create({
      productId: product._id,
      manufacturerId: fixedManufacturer._id,
      customerId: fixedCustomer._id,
      question: fixedQuestionsData[i].question,
      status: "answered",
      isVisible: true,
      answer: {
        text: fixedQuestionsData[i].answer,
        answeredBy: fixedManufacturer._id,
        answeredAt: faker.date.recent({ days: 30 }),
      },
    });
    questions.push(q);
  }

  // One unanswered question from fixed customer
  if (fixedMfgProducts.length > 0) {
    const q = await ProductQuestion.create({
      productId: fixedMfgProducts[0]._id,
      manufacturerId: fixedManufacturer._id,
      customerId: fixedCustomer._id,
      question:
        "Can you provide REACH and RoHS compliance documentation for the aluminum components?",
      status: "pending",
      isVisible: true,
    });
    questions.push(q);
  }

  // Random questions on all products
  for (const product of allProducts) {
    if (allCustomers.length === 0) continue;
    const count = randomInt(
      CONFIG.QUESTIONS_PER_PRODUCT.min,
      CONFIG.QUESTIONS_PER_PRODUCT.max,
    );
    for (let i = 0; i < count; i++) {
      const customer = randomItem(allCustomers);
      const isAnswered = randomBool(0.65);
      const q = await ProductQuestion.create({
        productId: product._id,
        manufacturerId: product.manufacturerId,
        customerId: customer._id,
        question: randomItem([
          "What is the standard lead time for bulk orders?",
          "Do you offer OEM packaging options?",
          "Are these products export quality with proper certifications?",
          "What is the warranty period on these products?",
          "Can we get custom colors or finishes?",
          "What quality control process do you follow?",
          "Is there a price break for orders above 1000 units?",
          "What are the payment terms for first-time buyers?",
          "Do you ship internationally?",
          "Can you provide a material test certificate?",
        ]),
        status: isAnswered ? "answered" : "pending",
        isVisible: randomBool(0.9),
        answer: isAnswered
          ? {
              text: randomItem([
                "Standard lead time is 15-20 working days for bulk orders.",
                "Yes, we offer full OEM packaging with your branding.",
                "All our products are export quality with ISO certification.",
                "We provide a 12-month warranty against manufacturing defects.",
                "Custom colors are available with Pantone matching at extra cost.",
                "We follow ISO 9001 quality management standards with 100% inspection.",
                "Yes, orders above 1000 units qualify for our volume pricing.",
                "We accept 50% advance and 50% before dispatch.",
                "Yes, we export globally with proper documentation.",
                "Material test certificates are available upon request.",
              ]),
              answeredBy: product.manufacturerId,
              answeredAt: faker.date.recent({ days: 60 }),
            }
          : undefined,
      });
      questions.push(q);
    }
  }

  console.log(`✓ Created ${questions.length} product questions`);
  return questions;
}

// ============================================================================
// 6. CREATE FIXED ACCOUNT ORDERS (all types, all statuses)
// ============================================================================
async function createFixedAccountOrders(
  fixedCustomer,
  fixedManufacturer,
  fixedProducts,
  allProducts,
  allManufacturers,
) {
  console.log("Creating fixed account orders...");
  const orders = [];
  const customOrders = [];
  const rfqs = [];
  const bids = [];
  const groupBuys = [];

  // ---- ORDER 1: Product Order - completed (with review) ----
  const prod1 = fixedProducts[0]; // CNC Bracket
  const order1 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "product",
    productId: prod1._id,
    productDetails: {
      name: prod1.name,
      description: prod1.description,
      specifications: prod1.specifications,
    },
    quantity: 200,
    unitPrice: prod1.price,
    totalPrice: prod1.price * 200,
    status: "completed",
    paymentStatus: "captured",
    paymentIntentId: `pi_fixed_order1_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    shippingMethod: "TCS Courier",
    trackingNumber: "TCS123456789",
    estimatedDeliveryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    actualDeliveryDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    manufacturerAcceptedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    milestones: [
      {
        name: "Order Confirmed",
        status: "completed",
        completedAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Material Procurement",
        status: "completed",
        completedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      },
      {
        name: "CNC Machining",
        status: "completed",
        completedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Quality Inspection",
        status: "completed",
        completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Shipped",
        status: "completed",
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  orders.push(order1);

  // Review for order1
  const review1 = await Review.create({
    orderId: order1._id,
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    productId: prod1._id,
    overallRating: 5,
    qualityRating: 5,
    communicationRating: 5,
    deliveryRating: 4,
    title: "Excellent precision and quality!",
    comment:
      "TechForge Industries delivered exactly what was promised. The CNC brackets are perfectly machined with tight tolerances. Packaging was secure and delivery was on time. Will definitely order again!",
    photos: [
      `https://picsum.photos/seed/review-photo-1/800/600`,
      `https://picsum.photos/seed/review-photo-2/800/600`,
    ],
    recommended: true,
    manufacturerResponse: {
      comment:
        "Thank you Ahmed for the kind words! It was a pleasure working with you. We look forward to fulfilling your future orders.",
      respondedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });
  await Order.findByIdAndUpdate(order1._id, {
    reviewId: review1._id,
    reviewed: true,
  });

  // ---- ORDER 2: Product Order - in_production ----
  const prod2 = fixedProducts[1]; // Sheet Metal Enclosure
  const order2 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "product",
    productId: prod2._id,
    productDetails: {
      name: prod2.name,
      description: prod2.description,
      specifications: prod2.specifications,
    },
    quantity: 75,
    unitPrice: prod2.price,
    totalPrice: prod2.price * 75,
    status: "in_production",
    paymentStatus: "captured",
    paymentIntentId: `pi_fixed_order2_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    shippingMethod: "Leopards Courier",
    estimatedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    manufacturerAcceptedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    specialRequirements:
      "Custom RAL 7035 light gray powder coating. Cutouts per attached drawing.",
    milestones: [
      {
        name: "Order Confirmed",
        status: "completed",
        completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Sheet Metal Cutting",
        status: "completed",
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      { name: "Bending & Assembly", status: "in_progress" },
      { name: "Powder Coating", status: "pending" },
      { name: "Quality Check & Dispatch", status: "pending" },
    ],
  });
  orders.push(order2);

  // ---- ORDER 3: Product Order - pending_acceptance ----
  const prod3 = fixedProducts[4]; // Heat Sink
  const order3 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "product",
    productId: prod3._id,
    productDetails: {
      name: prod3.name,
      description: prod3.description,
      specifications: prod3.specifications,
    },
    quantity: 150,
    unitPrice: prod3.price,
    totalPrice: prod3.price * 150,
    status: "pending_acceptance",
    paymentStatus: "authorized",
    paymentIntentId: `pi_fixed_order3_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[1],
    specialRequirements:
      "Black anodized finish. Custom 3mm mounting holes pattern.",
    milestones: [],
  });
  orders.push(order3);

  // ---- ORDER 4: Product Order - shipped ----
  const prod4 = fixedProducts[2]; // Fastener Set
  const order4 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "product",
    productId: prod4._id,
    productDetails: {
      name: prod4.name,
      description: prod4.description,
      specifications: prod4.specifications,
    },
    quantity: 500,
    unitPrice: prod4.price,
    totalPrice: prod4.price * 500,
    status: "shipped",
    paymentStatus: "captured",
    paymentIntentId: `pi_fixed_order4_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    shippingMethod: "TCS Courier",
    trackingNumber: "TCS987654321",
    estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    manufacturerAcceptedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    milestones: [
      {
        name: "Order Confirmed",
        status: "completed",
        completedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Production",
        status: "completed",
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Quality Check",
        status: "completed",
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Shipped",
        status: "completed",
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  orders.push(order4);

  // ---- ORDER 5: RFQ Order (customer creates custom order → rfq → manufacturer bids → order placed) ----
  const customOrder5 = await CustomOrder.create({
    customerId: fixedCustomer._id,
    title: "Custom Hydraulic Manifold Block",
    description:
      'We need a custom hydraulic manifold block machined from EN8 steel. Ports: 4x G1/2" BSP, 2x G1/4" BSP. Pressure rating 350 bar. Need 30 units initially.',
    quantity: 30,
    materialPreferences: ["Steel"],
    colorSpecifications: ["Natural (unpainted)"],
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    images: [
      {
        url: "https://picsum.photos/seed/manifold-custom-1/800/600",
        caption: "Reference design",
      },
      {
        url: "https://picsum.photos/seed/manifold-custom-2/800/600",
        caption: "Port configuration",
      },
    ],
    specialRequirements:
      "Pressure test certificate required for each unit. Threads to be plug gauged.",
    budget: 180000,
    sourceType: "general_custom",
    status: "order_placed",
  });
  customOrders.push(customOrder5);

  const rfq5 = await RFQ.create({
    customOrderId: customOrder5._id,
    customerId: fixedCustomer._id,
    duration: 120, // 5 days
    startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    status: "bid_accepted",
    minBidThreshold: 120000,
    broadcastToAll: true,
    bidsCount: 3,
    closedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });
  rfqs.push(rfq5);
  await CustomOrder.findByIdAndUpdate(customOrder5._id, {
    status: "rfq_created",
    rfqId: rfq5._id,
  });

  // Competing bids (from other manufacturers)
  const otherMfg1 = allManufacturers[0];
  const otherMfg2 = allManufacturers[1] || allManufacturers[0];

  const bid5a = await Bid.create({
    rfqId: rfq5._id,
    manufacturerId: otherMfg1._id,
    amount: 185000,
    costBreakdown: {
      materials: 74000,
      labor: 55500,
      overhead: 27750,
      profit: 27750,
    },
    timeline: 25,
    proposedMilestones: [
      {
        name: "Design Review",
        duration: 3,
        description: "Review technical drawings",
      },
      {
        name: "Machining",
        duration: 18,
        description: "CNC machining of manifold blocks",
      },
      {
        name: "Testing & Inspection",
        duration: 4,
        description: "Pressure testing and gauge inspection",
      },
    ],
    materialsDescription: "EN8 steel bar stock from certified supplier.",
    processDescription: "4-axis CNC machining with thread milling.",
    paymentTerms: "50% advance, 50% on delivery",
    warrantyInfo: "6 months manufacturing defect warranty",
    status: "rejected",
    submittedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
  });
  bids.push(bid5a);

  const bid5b = await Bid.create({
    rfqId: rfq5._id,
    manufacturerId: otherMfg2._id,
    amount: 195000,
    costBreakdown: {
      materials: 78000,
      labor: 58500,
      overhead: 29250,
      profit: 29250,
    },
    timeline: 30,
    proposedMilestones: [
      {
        name: "Engineering Review",
        duration: 5,
        description: "Technical review and fixture design",
      },
      { name: "Production", duration: 20, description: "Full production run" },
      {
        name: "QC & Dispatch",
        duration: 5,
        description: "100% inspection and dispatch",
      },
    ],
    status: "rejected",
    submittedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
  });
  bids.push(bid5b);

  // Winning bid from fixed manufacturer
  const bid5c = await Bid.create({
    rfqId: rfq5._id,
    manufacturerId: fixedManufacturer._id,
    amount: 162000,
    costBreakdown: {
      materials: 64800,
      labor: 48600,
      overhead: 24300,
      profit: 24300,
    },
    timeline: 20,
    proposedMilestones: [
      {
        name: "Drawing Review & Fixture",
        duration: 2,
        description: "Review customer drawings and prepare CNC fixtures",
      },
      {
        name: "Rough Machining",
        duration: 10,
        description: "Rough machining of all 30 blocks",
      },
      {
        name: "Finish Machining & Threading",
        duration: 5,
        description: "Finish passes and thread milling with gauging",
      },
      {
        name: "Pressure Testing & Dispatch",
        duration: 3,
        description: "100% pressure test to 350 bar + dispatch",
      },
    ],
    materialsDescription:
      "EN8 steel from PSQCA approved mill. Material certificate provided.",
    processDescription:
      "5-axis CNC machining. All threads plug/ring gauged. Pressure tested individually.",
    paymentTerms: "40% advance, 60% after pressure test certificates",
    warrantyInfo: "12 months warranty on machining defects",
    status: "accepted",
    markedForConsideration: true,
    submittedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
    acceptedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  });
  bids.push(bid5c);

  await RFQ.findByIdAndUpdate(rfq5._id, { acceptedBidId: bid5c._id });

  const order5 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "rfq",
    rfqId: rfq5._id,
    bidId: bid5c._id,
    productDetails: {
      name: customOrder5.title,
      description: customOrder5.description,
    },
    quantity: 30,
    agreedPrice: 162000,
    totalPrice: 162000,
    timeline: 20,
    status: "in_production",
    paymentStatus: "captured",
    paymentIntentId: `pi_fixed_rfq_order_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    manufacturerAcceptedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
    estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    specialRequirements:
      "Pressure test certificate required for each unit. Threads to be plug gauged.",
    milestones: [
      {
        name: "Drawing Review & Fixture",
        status: "completed",
        completedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Rough Machining",
        status: "completed",
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      { name: "Finish Machining & Threading", status: "in_progress" },
      { name: "Pressure Testing & Dispatch", status: "pending" },
    ],
  });
  orders.push(order5);
  await CustomOrder.findByIdAndUpdate(customOrder5._id, {
    status: "order_placed",
  });

  // ---- ORDER 6: Disputed Order (completed but disputed) ----
  const prod5 = fixedProducts[3]; // Welded Frame
  const order6 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "product",
    productId: prod5._id,
    productDetails: {
      name: prod5.name,
      description: prod5.description,
      specifications: prod5.specifications,
    },
    quantity: 15,
    unitPrice: prod5.price,
    totalPrice: prod5.price * 15,
    status: "disputed",
    paymentStatus: "captured",
    paymentIntentId: `pi_fixed_order6_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    shippingMethod: "Own Transport",
    trackingNumber: null,
    manufacturerAcceptedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    estimatedDeliveryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    milestones: [
      {
        name: "Order Confirmed",
        status: "completed",
        completedAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Fabrication",
        status: "completed",
        completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Surface Treatment",
        status: "completed",
        completedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Delivered",
        status: "completed",
        completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  orders.push(order6);

  // Active (open) dispute for order6
  const dispute6 = await Dispute.create({
    orderId: order6._id,
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    issueType: "quality_issue",
    description:
      "We received the 15 welded steel frames but found significant quality issues. 5 out of 15 frames have visible porosity defects in the welds which was not acceptable per the agreed quality standard. Additionally, the powder coating on 8 frames is uneven with runs and sags. We had to halt our production line due to this issue.",
    desiredResolution: "partial_refund",
    customerEvidence: [
      "https://picsum.photos/seed/dispute-evidence-1/800/600",
      "https://picsum.photos/seed/dispute-evidence-2/800/600",
      "https://picsum.photos/seed/dispute-evidence-3/800/600",
    ],
    manufacturerResponse: {
      comment:
        "We acknowledge the customer's concern. Our QC team is reviewing the reported defects. We are committed to resolving this fairly and will respond with our findings within 48 hours.",
      evidence: ["https://picsum.photos/seed/mfg-evidence-1/800/600"],
      respondedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    status: "manufacturer_responded",
  });

  // ---- ORDER 7: Resolved Dispute (older completed order) ----
  const prod6 = fixedProducts[5]; // Brass Fittings
  const order7 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "product",
    productId: prod6._id,
    productDetails: {
      name: prod6.name,
      description: prod6.description,
      specifications: prod6.specifications,
    },
    quantity: 1000,
    unitPrice: prod6.price,
    totalPrice: prod6.price * 1000,
    status: "completed",
    paymentStatus: "partially_refunded",
    refundAmount: prod6.price * 1000 * 0.2,
    refundReason:
      "Partial refund for 20% defective items as per dispute resolution",
    paymentIntentId: `pi_fixed_order7_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    shippingMethod: "TCS Courier",
    trackingNumber: "TCS111222333",
    manufacturerAcceptedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    milestones: [
      {
        name: "Order Confirmed",
        status: "completed",
        completedAt: new Date(Date.now() - 88 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Production",
        status: "completed",
        completedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Shipped",
        status: "completed",
        completedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
      },
      {
        name: "Delivered",
        status: "completed",
        completedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  orders.push(order7);

  // Resolved dispute for order7 (admin resolved it)
  // We'll pass admin ID later; create a placeholder and update
  const dispute7 = await Dispute.create({
    orderId: order7._id,
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    issueType: "item_not_as_described",
    description:
      "Approximately 200 out of 1000 brass fittings had incorrect thread pitch (M8 instead of M10 as specified). This caused assembly failures on our production line. We are requesting a refund for the defective units.",
    desiredResolution: "partial_refund",
    customerEvidence: [
      "https://picsum.photos/seed/dispute7-evidence-1/800/600",
      "https://picsum.photos/seed/dispute7-evidence-2/800/600",
    ],
    manufacturerResponse: {
      comment:
        "We have verified the customer's claim. It appears there was a batch mix-up at our facility. We accept responsibility for the 200 defective units and agree to the partial refund.",
      evidence: ["https://picsum.photos/seed/mfg7-evidence-1/800/600"],
      respondedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
    },
    status: "resolved",
    resolution: "partial_resolution",
    resolutionAmount: prod6.price * 1000 * 0.2,
    resolutionMessage:
      "Admin reviewed both parties' submissions. A 20% partial refund has been approved to compensate for the 200 defective units. Both parties have agreed to this resolution.",
    resolvedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    adminNotes:
      "Customer provided photographic evidence of wrong thread pitch. Manufacturer admitted fault. Partial refund of 20% approved.",
  });

  // ---- ORDER 8: Cancelled Order ----
  const order8 = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "product",
    productId: fixedProducts[0]._id,
    productDetails: {
      name: fixedProducts[0].name,
      description: fixedProducts[0].description,
    },
    quantity: 100,
    unitPrice: fixedProducts[0].price,
    totalPrice: fixedProducts[0].price * 100,
    status: "cancelled",
    paymentStatus: "refunded",
    refundAmount: fixedProducts[0].price * 100,
    refundReason: "Order cancelled by customer before production started",
    paymentIntentId: `pi_fixed_order8_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    manufacturerAcceptedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    cancelledAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
    cancellationReason:
      "Project requirements changed. Cancellation requested before production.",
    cancellationStatus: "confirmed",
    cancellationRequestedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
    cancellationConfirmedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
    milestones: [
      {
        name: "Order Confirmed",
        status: "completed",
        completedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  orders.push(order8);

  // ---- Group Buy order (fixed customer joins fixed manufacturer's group buy) ----
  // Create a group buy first for fixed manufacturer
  const gbProduct = fixedProducts[2]; // Fasteners
  const gbBasePrice = gbProduct.price;
  const groupBuy = await GroupBuy.create({
    manufacturerId: fixedManufacturer._id,
    productId: gbProduct._id,
    title: `Group Buy: ${gbProduct.name} — Bulk Discount Campaign`,
    description:
      "Join our group buy for stainless steel fasteners and unlock amazing discounts! Higher quantities mean bigger savings for everyone.",
    basePrice: gbBasePrice,
    tiers: [
      {
        tierNumber: 1,
        minQuantity: 500,
        discountPercent: 10,
        discountedPrice: gbBasePrice * 0.9,
      },
      {
        tierNumber: 2,
        minQuantity: 1000,
        discountPercent: 15,
        discountedPrice: gbBasePrice * 0.85,
      },
      {
        tierNumber: 3,
        minQuantity: 2000,
        discountPercent: 20,
        discountedPrice: gbBasePrice * 0.8,
      },
    ],
    minParticipants: 3,
    maxParticipants: 50,
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    status: "active",
    termsAndConditions:
      "Payment must be completed within 48 hours of group buy closure. Delivery within 21 days of payment.",
    currentQuantity: 1300,
    currentParticipantCount: 8,
    currentTierIndex: 1,
    currentDiscountedPrice: gbBasePrice * 0.85,
  });
  groupBuys.push(groupBuy);

  // Fixed customer participating in the group buy — creates an order
  const gbOrder = await Order.create({
    customerId: fixedCustomer._id,
    manufacturerId: fixedManufacturer._id,
    orderType: "group_buy",
    productId: gbProduct._id,
    groupBuyId: groupBuy._id,
    productDetails: {
      name: gbProduct.name,
      description: gbProduct.description,
      specifications: gbProduct.specifications,
    },
    quantity: 300,
    unitPrice: gbBasePrice * 0.85,
    totalPrice: gbBasePrice * 0.85 * 300,
    discount: gbBasePrice * 0.15 * 300,
    status: "accepted",
    paymentStatus: "authorized",
    paymentIntentId: `pi_fixed_gb_order_${faker.string.alphanumeric(16)}`,
    deliveryAddress: fixedCustomer.savedAddresses[0],
    manufacturerAcceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    estimatedDeliveryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    milestones: [
      {
        name: "Group Buy Joined",
        status: "completed",
        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      { name: "Awaiting Group Buy Closure", status: "in_progress" },
      { name: "Production", status: "pending" },
      { name: "Delivery", status: "pending" },
    ],
  });
  orders.push(gbOrder);

  // Update group buy with fixed customer as participant
  await GroupBuy.findByIdAndUpdate(groupBuy._id, {
    $push: {
      participants: {
        customerId: fixedCustomer._id,
        quantity: 300,
        unitPrice: gbBasePrice * 0.85,
        totalPrice: gbBasePrice * 0.85 * 300,
        paymentIntentId: gbOrder.paymentIntentId,
        paymentStatus: "authorized",
        orderId: gbOrder._id,
      },
    },
  });

  // ---- Active RFQ (pending bids) ----
  const customOrder9 = await CustomOrder.create({
    customerId: fixedCustomer._id,
    title: "Injection Molded ABS Cover Panels",
    description:
      "We need custom injection molded ABS plastic cover panels for our electronic control units. Quantity: 500 units. Color: RAL 9005 black matte. Need UL94-V0 grade ABS.",
    quantity: 500,
    materialPreferences: ["Plastic"],
    colorSpecifications: ["Black Matte (RAL 9005)"],
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    images: [
      {
        url: "https://picsum.photos/seed/abs-panel-rfq/800/600",
        caption: "Sample design reference",
      },
    ],
    specialRequirements:
      "UL94-V0 flame retardant grade required. Dimensional drawing attached.",
    budget: 95000,
    sourceType: "general_custom",
    status: "rfq_created",
  });
  customOrders.push(customOrder9);

  const rfq9 = await RFQ.create({
    customOrderId: customOrder9._id,
    customerId: fixedCustomer._id,
    duration: 168, // 7 days
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: "active",
    minBidThreshold: 70000,
    broadcastToAll: true,
    bidsCount: 1,
  });
  rfqs.push(rfq9);
  await CustomOrder.findByIdAndUpdate(customOrder9._id, { rfqId: rfq9._id });

  // One bid from fixed manufacturer on the active RFQ
  const bid9 = await Bid.create({
    rfqId: rfq9._id,
    manufacturerId: fixedManufacturer._id,
    amount: 87500,
    costBreakdown: {
      materials: 35000,
      labor: 26250,
      overhead: 13125,
      profit: 13125,
    },
    timeline: 28,
    proposedMilestones: [
      {
        name: "Mold Design & Approval",
        duration: 8,
        description: "CAD design and customer approval of mold design",
      },
      {
        name: "Mold Fabrication",
        duration: 12,
        description: "CNC milling of P20 steel mold",
      },
      {
        name: "Trial Shots & Validation",
        duration: 4,
        description: "T1 trial and dimensional validation",
      },
      {
        name: "Production Run & Delivery",
        duration: 4,
        description: "Full production run and dispatch",
      },
    ],
    materialsDescription:
      "UL94-V0 rated ABS from LG Chem. Material datasheet provided.",
    processDescription:
      "Injection molding on 280T machine. Mold in P20 steel for 100,000 shot life.",
    paymentTerms: "30% mold cost upfront, 30% on T1 approval, 40% on delivery",
    warrantyInfo: "Mold warranty 100,000 shots. Part warranty 6 months.",
    questions:
      "Please confirm the wall thickness tolerance (±0.1mm assumed). Any specific gate location requirements?",
    status: "pending",
    markedForConsideration: false,
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });
  bids.push(bid9);

  // Additional group buys for fixed manufacturer (various statuses)
  const gbCompleted = await GroupBuy.create({
    manufacturerId: fixedManufacturer._id,
    productId: fixedProducts[0]._id,
    title: `Group Buy: CNC Precision Brackets — Completed`,
    description:
      "Successfully completed group buy campaign for CNC precision brackets.",
    basePrice: fixedProducts[0].price,
    tiers: [
      {
        tierNumber: 1,
        minQuantity: 100,
        discountPercent: 8,
        discountedPrice: fixedProducts[0].price * 0.92,
      },
      {
        tierNumber: 2,
        minQuantity: 300,
        discountPercent: 12,
        discountedPrice: fixedProducts[0].price * 0.88,
      },
      {
        tierNumber: 3,
        minQuantity: 500,
        discountPercent: 18,
        discountedPrice: fixedProducts[0].price * 0.82,
      },
    ],
    minParticipants: 5,
    startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    status: "completed",
    currentQuantity: 620,
    currentParticipantCount: 12,
    currentTierIndex: 2,
    currentDiscountedPrice: fixedProducts[0].price * 0.82,
    completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  });
  groupBuys.push(gbCompleted);

  const gbScheduled = await GroupBuy.create({
    manufacturerId: fixedManufacturer._id,
    productId: fixedProducts[1]._id,
    title: `Group Buy: Sheet Metal Enclosures — Upcoming`,
    description:
      "Upcoming group buy campaign for sheet metal enclosures. Register your interest now!",
    basePrice: fixedProducts[1].price,
    tiers: [
      {
        tierNumber: 1,
        minQuantity: 50,
        discountPercent: 10,
        discountedPrice: fixedProducts[1].price * 0.9,
      },
      {
        tierNumber: 2,
        minQuantity: 150,
        discountPercent: 17,
        discountedPrice: fixedProducts[1].price * 0.83,
      },
      {
        tierNumber: 3,
        minQuantity: 300,
        discountPercent: 22,
        discountedPrice: fixedProducts[1].price * 0.78,
      },
    ],
    minParticipants: 5,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
    status: "scheduled",
    currentQuantity: 0,
    currentParticipantCount: 0,
    currentTierIndex: -1,
    currentDiscountedPrice: fixedProducts[1].price,
  });
  groupBuys.push(gbScheduled);

  console.log(
    `✓ Created ${orders.length} fixed account orders, ${rfqs.length} RFQs, ${bids.length} bids, ${groupBuys.length} group buys`,
  );
  return {
    orders,
    customOrders,
    rfqs,
    bids,
    groupBuys,
    disputes: [dispute6, dispute7],
  };
}

// ============================================================================
// 7. CREATE EXTRA CUSTOM ORDERS, RFQS, BIDS
// ============================================================================
async function createExtraRFQWorkflow(
  allCustomers,
  allManufacturers,
  allProducts,
) {
  console.log("Creating extra RFQ workflow...");
  const customOrders = [];
  const rfqs = [];
  const bids = [];

  const verifiedManufacturers = allManufacturers.filter(
    (m) => m.verificationStatus === "verified",
  );
  const customizableProducts = allProducts.filter(
    (p) => p.customizationOptions,
  );

  for (const customer of allCustomers) {
    const count = randomInt(
      CONFIG.CUSTOM_ORDERS_PER_CUSTOMER.min,
      CONFIG.CUSTOM_ORDERS_PER_CUSTOMER.max,
    );
    for (let i = 0; i < count; i++) {
      const sourceType = randomItem([
        "general_custom",
        "product_customization",
        "manufacturer_direct",
      ]);
      let sourceProductId,
        sourceManufacturerId,
        sourceContext,
        requestedCustomizationTypes = [];

      if (
        sourceType === "product_customization" &&
        customizableProducts.length > 0
      ) {
        const p = randomItem(customizableProducts);
        sourceProductId = p._id;
        sourceManufacturerId = p.manufacturerId;
        requestedCustomizationTypes = randomSubset(
          p.customizationCapabilities?.allowedTypes?.length > 0
            ? p.customizationCapabilities.allowedTypes
            : CUSTOMIZATION_TYPE_IDS,
          1,
          3,
        );
        sourceContext = {
          productName: p.name,
          manufacturerName: "Manufacturer",
          productCustomizationCapabilities: requestedCustomizationTypes,
        };
      } else if (
        sourceType === "manufacturer_direct" &&
        verifiedManufacturers.length > 0
      ) {
        const m = randomItem(verifiedManufacturers);
        sourceManufacturerId = m._id;
        requestedCustomizationTypes = randomSubset(
          CUSTOMIZATION_TYPE_IDS,
          1,
          3,
        );
        sourceContext = { manufacturerName: m.businessName || m.name };
      }

      const budget = randomInt(20000, 600000);
      const co = await CustomOrder.create({
        customerId: customer._id,
        title: faker.commerce.productName() + " Custom Order",
        description: faker.lorem.paragraphs(2),
        quantity: randomInt(50, 2000),
        materialPreferences: randomSubset(materials, 1, 3),
        colorSpecifications: randomSubset(
          ["Red", "Blue", "Green", "Black", "White", "Silver"],
          1,
          2,
        ),
        deadline: faker.date.future({ years: 0.5 }),
        images: randomBool(0.6)
          ? [
              {
                url: `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/600`,
                caption: "Reference image",
              },
            ]
          : [],
        specialRequirements: faker.lorem.sentence(),
        budget,
        sourceType,
        sourceProductId,
        sourceManufacturerId,
        requestedCustomizationTypes,
        sourceContext,
        status: "submitted",
      });
      customOrders.push(co);

      // 65% become RFQs
      if (!randomBool(CONFIG.RFQS_PERCENTAGE)) continue;

      const duration = randomInt(48, 240);
      const startDate = faker.date.recent({ days: 25 });
      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
      const isActive = endDate > new Date();

      const rfq = await RFQ.create({
        customOrderId: co._id,
        customerId: customer._id,
        duration,
        startDate,
        endDate,
        status: isActive ? "active" : randomBool(0.7) ? "closed" : "cancelled",
        minBidThreshold: budget * 0.6,
        broadcastToAll: randomBool(0.75),
        bidsCount: 0,
        closedAt: !isActive ? endDate : null,
      });
      rfqs.push(rfq);
      await CustomOrder.findByIdAndUpdate(co._id, {
        status: "rfq_created",
        rfqId: rfq._id,
      });

      // Bids on this RFQ
      if (verifiedManufacturers.length === 0) continue;
      const bidCount = randomInt(
        CONFIG.BIDS_PER_RFQ.min,
        Math.min(CONFIG.BIDS_PER_RFQ.max, verifiedManufacturers.length),
      );
      const biddingMfgs = faker.helpers.arrayElements(
        verifiedManufacturers,
        bidCount,
      );
      let hasAccepted = false;

      for (const mfg of biddingMfgs) {
        const amount = randomInt(budget * 0.7, budget * 1.3);
        const isAccepted = !isActive && !hasAccepted && randomBool(0.4);
        if (isAccepted) hasAccepted = true;

        const bid = await Bid.create({
          rfqId: rfq._id,
          manufacturerId: mfg._id,
          amount,
          costBreakdown: {
            materials: amount * 0.4,
            labor: amount * 0.3,
            overhead: amount * 0.15,
            profit: amount * 0.15,
          },
          timeline: randomInt(10, 60),
          proposedMilestones: [
            {
              name: "Design Review",
              duration: randomInt(2, 5),
              description: "Technical drawing review and approval",
            },
            {
              name: "Production",
              duration: randomInt(10, 30),
              description: "Manufacturing phase",
            },
            {
              name: "QC & Dispatch",
              duration: randomInt(2, 5),
              description: "Quality inspection and dispatch",
            },
          ],
          materialsDescription: faker.lorem.sentence(),
          processDescription: faker.lorem.sentence(),
          paymentTerms: randomItem([
            "50% upfront, 50% on delivery",
            "40% advance, 60% on dispatch",
            "100% advance",
          ]),
          warrantyInfo: randomItem([
            "6 months manufacturing defect warranty",
            "12 months warranty",
            "3 months warranty",
          ]),
          status: isAccepted
            ? "accepted"
            : randomItem([
                "pending",
                "pending",
                "under_consideration",
                "rejected",
              ]),
          markedForConsideration: randomBool(0.3),
          submittedAt: faker.date.between({ from: startDate, to: new Date() }),
          acceptedAt: isAccepted ? new Date() : null,
        });
        bids.push(bid);
      }

      await RFQ.findByIdAndUpdate(rfq._id, { bidsCount: biddingMfgs.length });
    }
  }

  console.log(
    `✓ Created ${customOrders.length} custom orders, ${rfqs.length} RFQs, ${bids.length} bids (extra)`,
  );
  return { customOrders, rfqs, bids };
}

// ============================================================================
// 8. CREATE EXTRA GROUP BUYS
// ============================================================================
async function createExtraGroupBuys(allManufacturers, allProducts) {
  console.log("Creating extra group buys...");
  const groupBuys = [];
  const verifiedMfgs = allManufacturers.filter(
    (m) => m.verificationStatus === "verified",
  );

  for (const mfg of verifiedMfgs) {
    const mfgProducts = allProducts.filter(
      (p) =>
        p.manufacturerId.toString() === mfg._id.toString() &&
        p.status === "active",
    );
    if (mfgProducts.length === 0) continue;

    const count = randomInt(
      CONFIG.GROUP_BUYS_PER_MANUFACTURER.min,
      CONFIG.GROUP_BUYS_PER_MANUFACTURER.max,
    );
    for (let i = 0; i < count; i++) {
      const product = randomItem(mfgProducts);
      const basePrice = product.price;
      const startDate = faker.date.recent({ days: 15 });
      const endDate = faker.date.soon({ days: 20, refDate: startDate });
      const now = new Date();
      let status;
      if (now < startDate) status = "scheduled";
      else if (now < endDate) status = "active";
      else status = randomBool(0.7) ? "completed" : "cancelled";

      const currentQty =
        status === "active"
          ? randomInt(0, 400)
          : status === "completed"
            ? randomInt(200, 800)
            : 0;

      const gb = await GroupBuy.create({
        manufacturerId: mfg._id,
        productId: product._id,
        title: `Group Buy: ${product.name}`,
        description: `Join our group buy for ${product.name}. Unlock better prices with higher quantities!`,
        basePrice,
        tiers: [
          {
            tierNumber: 1,
            minQuantity: 100,
            discountPercent: 8,
            discountedPrice: basePrice * 0.92,
          },
          {
            tierNumber: 2,
            minQuantity: 250,
            discountPercent: 13,
            discountedPrice: basePrice * 0.87,
          },
          {
            tierNumber: 3,
            minQuantity: 500,
            discountPercent: 20,
            discountedPrice: basePrice * 0.8,
          },
        ],
        minParticipants: randomInt(3, 10),
        maxParticipants: randomBool(0.5) ? randomInt(30, 200) : undefined,
        startDate,
        endDate,
        status,
        participants: [],
        currentQuantity: currentQty,
        currentParticipantCount: currentQty > 0 ? randomInt(2, 15) : 0,
        currentTierIndex:
          currentQty >= 500
            ? 2
            : currentQty >= 250
              ? 1
              : currentQty >= 100
                ? 0
                : -1,
        currentDiscountedPrice:
          currentQty >= 500
            ? basePrice * 0.8
            : currentQty >= 250
              ? basePrice * 0.87
              : currentQty >= 100
                ? basePrice * 0.92
                : basePrice,
        completedAt: status === "completed" ? endDate : null,
        cancelledAt: status === "cancelled" ? endDate : null,
        cancelReason:
          status === "cancelled"
            ? "Minimum participants not reached within the campaign period."
            : undefined,
      });
      groupBuys.push(gb);
    }
  }

  console.log(`✓ Created ${groupBuys.length} extra group buys`);
  return groupBuys;
}

// ============================================================================
// 9. CREATE EXTRA ORDERS
// ============================================================================
async function createExtraOrders(
  allCustomers,
  allManufacturers,
  allProducts,
  extraRfqs,
  extraBids,
) {
  console.log("Creating extra orders...");
  const orders = [];
  const activeProducts = allProducts.filter((p) => p.status === "active");
  const statusPool = [
    "pending_acceptance",
    "accepted",
    "in_production",
    "shipped",
    "completed",
    "cancelled",
  ];

  for (const customer of allCustomers) {
    const count = randomInt(
      CONFIG.ORDERS_PER_CUSTOMER.min,
      CONFIG.ORDERS_PER_CUSTOMER.max,
    );
    for (let i = 0; i < count; i++) {
      const orderType = randomItem(["product", "product", "product", "rfq"]);

      if (orderType === "rfq") {
        const acceptedBids = extraBids.filter((b) => b.status === "accepted");
        if (acceptedBids.length === 0) continue;
        const bid = randomItem(acceptedBids);
        const rfq = extraRfqs.find(
          (r) => r._id.toString() === bid.rfqId.toString(),
        );
        if (!rfq) continue;
        const co = await CustomOrder.findById(rfq.customOrderId);
        if (!co) continue;

        const status = randomItem([
          "accepted",
          "in_production",
          "shipped",
          "completed",
        ]);
        const order = await Order.create({
          customerId: customer._id,
          manufacturerId: bid.manufacturerId,
          orderType: "rfq",
          rfqId: rfq._id,
          bidId: bid._id,
          productDetails: { name: co.title, description: co.description },
          quantity: co.quantity,
          agreedPrice: bid.amount,
          totalPrice: bid.amount,
          timeline: bid.timeline,
          status,
          paymentStatus: "captured",
          paymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
          deliveryAddress: customer.savedAddresses[0],
          manufacturerAcceptedAt: faker.date.recent({ days: 30 }),
          estimatedDeliveryDate: faker.date.future({ years: 0.2 }),
          completedAt:
            status === "completed" ? faker.date.recent({ days: 20 }) : null,
          trackingNumber: ["shipped", "completed"].includes(status)
            ? faker.string.alphanumeric(12).toUpperCase()
            : null,
          milestones: bid.proposedMilestones.map((m, idx) => ({
            name: m.name,
            description: m.description,
            status: idx === 0 ? "completed" : "pending",
            completedAt: idx === 0 ? faker.date.recent({ days: 25 }) : null,
          })),
        });
        orders.push(order);

        // Update RFQ
        await RFQ.findByIdAndUpdate(rfq._id, {
          status: "bid_accepted",
          acceptedBidId: bid._id,
          closedAt: new Date(),
        });
        await CustomOrder.findByIdAndUpdate(co._id, { status: "order_placed" });
        continue;
      }

      // Product order
      if (activeProducts.length === 0) continue;
      const product = randomItem(activeProducts);
      const manufacturer = allManufacturers.find(
        (m) => m._id.toString() === product.manufacturerId.toString(),
      );
      if (!manufacturer) continue;

      const quantity = randomInt(product.moq, product.moq * 5);
      const unitPrice = product.price;
      const totalPrice = unitPrice * quantity;
      const status = randomItem(statusPool);

      const order = await Order.create({
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
          status === "pending_acceptance"
            ? "authorized"
            : status === "cancelled"
              ? "refunded"
              : "captured",
        paymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
        deliveryAddress: customer.savedAddresses[0],
        shippingMethod: randomItem([
          "TCS Courier",
          "Leopards Courier",
          "BlueEx",
          "M&P Courier",
        ]),
        estimatedDeliveryDate: faker.date.future({ years: 0.2 }),
        manufacturerAcceptedAt:
          status !== "pending_acceptance"
            ? faker.date.recent({ days: 30 })
            : null,
        completedAt:
          status === "completed" ? faker.date.recent({ days: 15 }) : null,
        cancelledAt:
          status === "cancelled" ? faker.date.recent({ days: 10 }) : null,
        cancellationReason:
          status === "cancelled"
            ? randomItem([
                "Requirements changed",
                "Found alternative supplier",
                "Budget constraints",
              ])
            : null,
        trackingNumber: ["shipped", "completed"].includes(status)
          ? faker.string.alphanumeric(12).toUpperCase()
          : null,
        milestones: ["in_production", "shipped", "completed"].includes(status)
          ? [
              {
                name: "Order Confirmed",
                status: "completed",
                completedAt: faker.date.recent({ days: 25 }),
              },
              {
                name: "In Production",
                status: "completed",
                completedAt: faker.date.recent({ days: 15 }),
              },
              {
                name: "Quality Check",
                status: ["shipped", "completed"].includes(status)
                  ? "completed"
                  : "in_progress",
                completedAt: ["shipped", "completed"].includes(status)
                  ? faker.date.recent({ days: 8 })
                  : null,
              },
            ]
          : [],
      });
      orders.push(order);
    }
  }

  console.log(`✓ Created ${orders.length} extra orders`);
  return orders;
}

// ============================================================================
// 10. CREATE REVIEWS
// ============================================================================
async function createReviews(allOrders) {
  console.log("Creating reviews...");
  const reviews = [];

  // Get all existing review orderId values from database
  const existingReviews = await Review.find({}, { orderId: 1 });
  const reviewedOrderIds = new Set(
    existingReviews.map((r) => r.orderId.toString()),
  );

  const completedOrders = allOrders.filter(
    (o) =>
      o.status === "completed" &&
      !o.reviewed &&
      !o.reviewId &&
      !reviewedOrderIds.has(o._id.toString()),
  );
  const reviewOrders = completedOrders.filter(() =>
    randomBool(CONFIG.REVIEWS_PERCENTAGE),
  );

  for (const order of reviewOrders) {
    const overallRating = randomInt(3, 5);
    const review = await Review.create({
      orderId: order._id,
      customerId: order.customerId,
      manufacturerId: order.manufacturerId,
      productId: order.productId,
      overallRating,
      qualityRating: Math.min(5, overallRating + randomInt(-1, 1)),
      communicationRating: Math.min(5, overallRating + randomInt(-1, 1)),
      deliveryRating: Math.min(5, overallRating + randomInt(-1, 1)),
      title: randomItem([
        "Great quality and fast delivery!",
        "Good manufacturer, would recommend",
        "Satisfied with the product",
        "Professional service",
        "Quality as expected",
        "Decent but room for improvement",
      ]),
      comment: faker.lorem.paragraph(),
      photos: randomBool(0.4)
        ? [
            `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/600`,
            `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/600`,
          ]
        : [],
      recommended: overallRating >= 4,
      manufacturerResponse: randomBool(0.5)
        ? {
            comment: randomItem([
              "Thank you for your feedback! We are glad you are satisfied.",
              "We appreciate your kind words and look forward to serving you again.",
              "Thank you for the review. We will work on the mentioned areas.",
            ]),
            respondedAt: faker.date.recent({ days: 10 }),
          }
        : undefined,
    });
    reviews.push(review);

    await Order.findByIdAndUpdate(order._id, {
      reviewId: review._id,
      reviewed: true,
    });

    // Update product stats
    if (order.productId) {
      const productReviews = await Review.find({ productId: order.productId });
      const avgRating =
        productReviews.reduce((sum, r) => sum + r.overallRating, 0) /
        productReviews.length;
      await Product.findByIdAndUpdate(order.productId, {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: productReviews.length,
      });
    }
  }

  console.log(`✓ Created ${reviews.length} reviews`);
  return reviews;
}

// ============================================================================
// 11. CREATE EXTRA DISPUTES
// ============================================================================
async function createExtraDisputes(allOrders, admin) {
  console.log("Creating extra disputes...");
  const disputes = [];
  const eligibleOrders = allOrders.filter((o) =>
    ["in_production", "shipped", "completed"].includes(o.status),
  );
  const disputeOrders = eligibleOrders.filter(() =>
    randomBool(CONFIG.DISPUTES_PERCENTAGE),
  );

  const issueTypes = [
    "quality_issue",
    "late_delivery",
    "item_not_as_described",
    "damaged_item",
    "wrong_item",
    "item_not_received",
  ];
  const resolutionTypes = [
    "refund_customer",
    "side_with_manufacturer",
    "partial_resolution",
  ];

  for (const order of disputeOrders) {
    const isResolved = randomBool(0.55);
    const hasMfgResponse = isResolved || randomBool(0.6);
    const resolution = isResolved ? randomItem(resolutionTypes) : null;

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
      customerEvidence: randomBool(0.7)
        ? [
            `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/600`,
            `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/600`,
          ]
        : [],
      manufacturerResponse: hasMfgResponse
        ? {
            comment: faker.lorem.paragraph(),
            evidence: randomBool(0.5)
              ? [
                  `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/600`,
                ]
              : [],
            respondedAt: faker.date.recent({ days: 15 }),
          }
        : undefined,
      status: isResolved
        ? "resolved"
        : hasMfgResponse
          ? randomItem(["manufacturer_responded", "under_review"])
          : "open",
      resolution,
      resolutionAmount:
        resolution === "refund_customer"
          ? order.totalPrice
          : resolution === "partial_resolution"
            ? order.totalPrice * 0.5
            : null,
      resolutionMessage: isResolved ? faker.lorem.sentence() : null,
      resolvedBy: isResolved ? admin._id : null,
      resolvedAt: isResolved ? faker.date.recent({ days: 20 }) : null,
      adminNotes: isResolved ? faker.lorem.paragraph() : null,
    });
    disputes.push(dispute);

    if (!isResolved) {
      await Order.findByIdAndUpdate(order._id, { status: "disputed" });
    }
  }

  console.log(`✓ Created ${disputes.length} extra disputes`);
  return disputes;
}

// ============================================================================
// 12. CREATE CHATS & MESSAGES
// ============================================================================
async function createChatsAndMessages(
  fixedCustomer,
  fixedManufacturer,
  fixedOrders,
  fixedBids,
  extraBids,
  extraOrders,
) {
  console.log("Creating chats and messages...");
  const conversations = [];
  const messages = [];

  async function createConversation(
    participants,
    contextType,
    contextId,
    msgPairs,
  ) {
    const conv = await Chat.create({
      participants,
      contextType,
      contextId,
      isActive: true,
    });
    conversations.push(conv);

    let lastMsg = null;
    for (let i = 0; i < msgPairs.length; i++) {
      const isCustomerTurn = i % 2 === 0;
      const [custId, mfgId] = participants;
      const senderId = isCustomerTurn ? custId : mfgId;
      const pool = isCustomerTurn ? customerMessages : manufacturerMessages;

      const msg = await ChatMessage.create({
        conversationId: conv._id,
        senderId,
        senderRole: isCustomerTurn ? "customer" : "manufacturer",
        senderName: isCustomerTurn ? "Ahmed Khan" : "Usman Tariq",
        message: randomItem(pool),
        readBy: [{ userId: senderId, readAt: new Date() }],
      });
      messages.push(msg);
      lastMsg = msg;
    }

    if (lastMsg) {
      await Chat.findByIdAndUpdate(conv._id, {
        lastMessage: {
          text: lastMsg.message,
          senderId: lastMsg.senderId,
          sentAt: lastMsg.createdAt,
        },
        unreadCounts: { [fixedManufacturer._id.toString()]: 1 },
      });
    }
    return conv;
  }

  // Fixed customer ↔ Fixed manufacturer: bid conversation (RFQ order)
  const rfqBid = fixedBids.find(
    (b) =>
      b.manufacturerId.toString() === fixedManufacturer._id.toString() &&
      b.status === "accepted",
  );
  if (rfqBid) {
    await createConversation(
      [fixedCustomer._id, fixedManufacturer._id],
      "bid",
      rfqBid._id,
      Array.from({ length: 10 }),
    );
  }

  // Fixed customer ↔ Fixed manufacturer: order conversations
  for (const order of fixedOrders
    .filter((o) => ["in_production", "completed", "shipped"].includes(o.status))
    .slice(0, 3)) {
    await createConversation(
      [fixedCustomer._id, fixedManufacturer._id],
      "order",
      order._id,
      Array.from({ length: randomInt(6, 12) }),
    );
  }

  // Extra bids — random chats
  const bidsWithChat = extraBids.filter(() => randomBool(0.35));
  for (const bid of bidsWithChat) {
    const rfq = await RFQ.findById(bid.rfqId);
    if (!rfq) continue;
    const conv = await Chat.create({
      participants: [rfq.customerId, bid.manufacturerId],
      contextType: "bid",
      contextId: bid._id,
      isActive: true,
    });
    conversations.push(conv);

    const msgCount = randomInt(
      CONFIG.MESSAGES_PER_CONVERSATION.min,
      CONFIG.MESSAGES_PER_CONVERSATION.max,
    );
    let lastMsg = null;
    for (let i = 0; i < msgCount; i++) {
      const isCustomer = i % 2 === 0;
      const senderId = isCustomer ? rfq.customerId : bid.manufacturerId;
      const msg = await ChatMessage.create({
        conversationId: conv._id,
        senderId,
        senderRole: isCustomer ? "customer" : "manufacturer",
        senderName: faker.person.fullName(),
        message: randomItem(
          isCustomer ? customerMessages : manufacturerMessages,
        ),
      });
      messages.push(msg);
      lastMsg = msg;
    }
    if (lastMsg) {
      await Chat.findByIdAndUpdate(conv._id, {
        lastMessage: {
          text: lastMsg.message,
          senderId: lastMsg.senderId,
          sentAt: lastMsg.createdAt,
        },
      });
    }
  }

  // Extra orders — random chats
  const ordersWithChat = extraOrders.filter(() => randomBool(0.4));
  for (const order of ordersWithChat) {
    const conv = await Chat.create({
      participants: [order.customerId, order.manufacturerId],
      contextType: "order",
      contextId: order._id,
      isActive: true,
    });
    conversations.push(conv);

    const msgCount = randomInt(
      CONFIG.MESSAGES_PER_CONVERSATION.min,
      CONFIG.MESSAGES_PER_CONVERSATION.max,
    );
    let lastMsg = null;
    for (let i = 0; i < msgCount; i++) {
      const isCustomer = i % 2 === 0;
      const senderId = isCustomer ? order.customerId : order.manufacturerId;
      const msg = await ChatMessage.create({
        conversationId: conv._id,
        senderId,
        senderRole: isCustomer ? "customer" : "manufacturer",
        senderName: faker.person.fullName(),
        message: randomItem(
          isCustomer ? customerMessages : manufacturerMessages,
        ),
      });
      messages.push(msg);
      lastMsg = msg;
    }
    if (lastMsg) {
      await Chat.findByIdAndUpdate(conv._id, {
        lastMessage: {
          text: lastMsg.message,
          senderId: lastMsg.senderId,
          sentAt: lastMsg.createdAt,
        },
      });
    }
  }

  console.log(
    `✓ Created ${conversations.length} conversations with ${messages.length} messages`,
  );
  return { conversations, messages };
}

// ============================================================================
// 13. CREATE SUPPORT TICKETS
// ============================================================================
async function createSupportTickets(
  fixedCustomer,
  fixedManufacturer,
  admin,
  allCustomers,
  allManufacturers,
) {
  console.log("Creating support tickets...");
  const tickets = [];

  // Fixed customer support tickets
  const fixedTicketsData = [
    {
      subject: "Payment not reflecting after successful transaction",
      category: "payment",
      priority: "high",
      status: "resolved",
      messages: [
        {
          role: "customer",
          text: "Hello, I made a payment for Order #ORD-123 3 days ago and the amount was deducted from my account but the order still shows 'Payment Pending'. Please help.",
        },
        {
          role: "admin",
          text: "Hello Ahmed, thank you for reaching out. I can see the payment transaction in our system. There seems to have been a webhook delay. I've manually updated the order status. Your order is now confirmed.",
        },
        {
          role: "customer",
          text: "Thank you! Yes I can see it's confirmed now. Appreciate the quick resolution!",
        },
        {
          role: "admin",
          text: "Glad we could resolve it! If you face any other issues, don't hesitate to contact us.",
        },
      ],
    },
    {
      subject: "How to track my shipped order?",
      category: "order",
      priority: "low",
      status: "resolved",
      messages: [
        {
          role: "customer",
          text: "I received a notification that my order has been shipped but I can't find the tracking number anywhere on the platform.",
        },
        {
          role: "admin",
          text: "Hi Ahmed! The tracking number is available on your order details page under the 'Shipping' section. The tracking number for your order is TCS987654321. You can track it on the TCS website.",
        },
        { role: "customer", text: "Found it, thank you!" },
      ],
    },
    {
      subject: "Need help understanding the Group Buy process",
      category: "other",
      priority: "medium",
      status: "open",
      messages: [
        {
          role: "customer",
          text: "I joined a group buy campaign but I'm not sure how the pricing works. If the campaign reaches tier 2, will my earlier payment be adjusted to the new discounted price?",
        },
        {
          role: "admin",
          text: "Great question! Yes, when a higher tier is unlocked, all existing participants automatically get the better discounted price. Your payment authorization will be updated accordingly. Is there anything else you'd like to know?",
        },
        {
          role: "customer",
          text: "That's great! One more question - what happens if the group buy doesn't reach minimum participants?",
        },
      ],
    },
  ];

  for (const data of fixedTicketsData) {
    const lastMsg = data.messages[data.messages.length - 1];
    const ticket = await SupportTicket.create({
      requesterId: fixedCustomer._id,
      requesterRole: "customer",
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      status: data.status,
      assignedAdminId: admin._id,
      lastMessagePreview: lastMsg.text.substring(0, 200),
      lastMessageAt: faker.date.recent({ days: 5 }),
      requesterUnreadCount: data.status === "open" ? 1 : 0,
      adminUnreadCount: 0,
      resolvedAt:
        data.status === "resolved" ? faker.date.recent({ days: 10 }) : null,
    });
    tickets.push(ticket);

    for (const msg of data.messages) {
      await SupportTicketMessage.create({
        ticketId: ticket._id,
        senderId: msg.role === "customer" ? fixedCustomer._id : admin._id,
        senderRole: msg.role === "customer" ? "customer" : "admin",
        senderName: msg.role === "customer" ? "Ahmed Khan" : "CraftIt Support",
        message: msg.text,
      });
    }
  }

  // Fixed manufacturer support ticket
  const mfgTicket = await SupportTicket.create({
    requesterId: fixedManufacturer._id,
    requesterRole: "manufacturer",
    subject: "Verification documents resubmission - additional docs needed?",
    category: "account",
    priority: "medium",
    status: "in_progress",
    assignedAdminId: admin._id,
    lastMessagePreview:
      "Please let me know which additional documents are needed for re-verification.",
    lastMessageAt: faker.date.recent({ days: 2 }),
    requesterUnreadCount: 0,
    adminUnreadCount: 1,
  });
  tickets.push(mfgTicket);

  for (const msg of [
    {
      role: "manufacturer",
      text: "Hello, our NTN certificate was flagged during verification. We have renewed it and uploaded the new certificate. Could you please re-review our application?",
    },
    {
      role: "admin",
      text: "Hello TechForge! Thank you for the resubmission. I can see the new NTN certificate. I'm reviewing the full application now and will get back to you within 24 hours.",
    },
    {
      role: "manufacturer",
      text: "Please let me know which additional documents are needed for re-verification.",
    },
  ]) {
    await SupportTicketMessage.create({
      ticketId: mfgTicket._id,
      senderId: msg.role === "manufacturer" ? fixedManufacturer._id : admin._id,
      senderRole: msg.role === "manufacturer" ? "manufacturer" : "admin",
      senderName:
        msg.role === "manufacturer" ? "Usman Tariq" : "CraftIt Support",
      message: msg.text,
    });
  }

  // Extra random support tickets
  const allUsers = [...allCustomers, ...allManufacturers];
  for (const user of allUsers) {
    const count = randomInt(
      CONFIG.SUPPORT_TICKETS_PER_USER.min,
      CONFIG.SUPPORT_TICKETS_PER_USER.max,
    );
    for (let i = 0; i < count; i++) {
      const isResolved = randomBool(0.6);
      const msgCount = randomInt(2, 5);
      const lastMsgText = faker.lorem.sentence();

      const ticket = await SupportTicket.create({
        requesterId: user._id,
        requesterRole:
          user.role === "manufacturer" ? "manufacturer" : "customer",
        subject: randomItem([
          "Issue with order delivery",
          "Payment not processed",
          "Cannot upload verification documents",
          "Account suspended incorrectly",
          "Product listing not approved",
          "RFQ not visible to manufacturers",
          "Bid submission error",
          "Need invoice for my order",
        ]),
        category: randomItem([
          "order",
          "payment",
          "product",
          "account",
          "technical",
          "other",
        ]),
        priority: randomItem(["low", "medium", "high"]),
        status: isResolved
          ? randomItem(["resolved", "closed"])
          : randomItem(["open", "in_progress", "waiting_for_user"]),
        assignedAdminId: randomBool(0.7) ? admin._id : null,
        lastMessagePreview: lastMsgText.substring(0, 200),
        lastMessageAt: faker.date.recent({ days: 20 }),
        requesterUnreadCount: randomInt(0, 3),
        adminUnreadCount: randomInt(0, 2),
        resolvedAt: isResolved ? faker.date.recent({ days: 15 }) : null,
      });
      tickets.push(ticket);

      for (let j = 0; j < msgCount; j++) {
        const isUserMsg = j % 2 === 0;
        await SupportTicketMessage.create({
          ticketId: ticket._id,
          senderId: isUserMsg ? user._id : admin._id,
          senderRole: isUserMsg
            ? user.role === "manufacturer"
              ? "manufacturer"
              : "customer"
            : "admin",
          senderName: isUserMsg ? user.name : "CraftIt Support",
          message: faker.lorem.sentences(2),
        });
      }
    }
  }

  console.log(`✓ Created ${tickets.length} support tickets`);
  return tickets;
}

// ============================================================================
// 14. CREATE NOTIFICATIONS (comprehensive)
// ============================================================================
async function createNotifications(
  fixedCustomer,
  fixedManufacturer,
  fixedOrders,
  fixedBids,
  allOrders,
  allBids,
  allCustomers,
  allManufacturers,
) {
  console.log("Creating notifications...");
  const notifications = [];

  async function notify(
    userId,
    type,
    title,
    message,
    link,
    relatedType,
    relatedId,
    isRead = false,
  ) {
    const n = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      relatedType,
      relatedId,
      isRead,
      readAt: isRead ? faker.date.recent({ days: 5 }) : null,
    });
    notifications.push(n);
    return n;
  }

  // Fixed customer notifications (rich set)
  const fixedNotifData = [
    {
      type: "order_placed",
      title: "Order Placed Successfully",
      message:
        "Your order for CNC Precision Brackets has been placed and is awaiting manufacturer acceptance.",
      link: `/customer/orders`,
      isRead: true,
    },
    {
      type: "order_accepted",
      title: "Order Accepted!",
      message:
        "TechForge Industries has accepted your order for Sheet Metal Enclosure Box. Production will begin shortly.",
      link: `/customer/orders`,
      isRead: true,
    },
    {
      type: "order_in_production",
      title: "Production Started",
      message:
        "Your order for Sheet Metal Enclosure Box is now in production. Expected delivery in 14 days.",
      link: `/customer/orders`,
      isRead: true,
    },
    {
      type: "order_shipped",
      title: "Order Shipped!",
      message:
        "Your fastener order has been shipped via TCS Courier. Tracking: TCS987654321",
      link: `/customer/orders`,
      isRead: false,
    },
    {
      type: "order_completed",
      title: "Order Delivered!",
      message:
        "Your order for CNC Precision Brackets has been marked as delivered. Please leave a review!",
      link: `/customer/orders`,
      isRead: true,
    },
    {
      type: "bid_received",
      title: "New Bid on Your RFQ",
      message:
        "TechForge Industries has submitted a bid of PKR 87,500 on your RFQ for Injection Molded ABS Cover Panels.",
      link: `/customer/rfqs`,
      isRead: false,
    },
    {
      type: "rfq_created",
      title: "RFQ Published",
      message:
        "Your RFQ for Custom Hydraulic Manifold Block has been published. Manufacturers can now submit bids.",
      link: `/customer/rfqs`,
      isRead: true,
    },
    {
      type: "group_buy_joined",
      title: "Group Buy Joined",
      message:
        "You have successfully joined the Group Buy campaign for Stainless Steel Fasteners.",
      link: `/group-buys`,
      isRead: true,
    },
    {
      type: "group_buy_tier_reached",
      title: "Tier 2 Unlocked!",
      message:
        "Great news! The fastener group buy has reached Tier 2. Your price is now PKR 1,020/unit (15% off).",
      link: `/group-buys`,
      isRead: false,
    },
    {
      type: "dispute_opened",
      title: "Dispute Opened",
      message:
        "Your dispute for the welded steel frames order has been opened. Admin review is in progress.",
      link: `/customer/disputes`,
      isRead: true,
    },
    {
      type: "dispute_resolved",
      title: "Dispute Resolved",
      message:
        "Your dispute for Order #ORD-BRASS has been resolved. A partial refund of PKR 850,000 has been approved.",
      link: `/customer/disputes`,
      isRead: true,
    },
    {
      type: "question_answered",
      title: "Your Question Was Answered",
      message:
        "TechForge Industries has answered your question about tolerance levels on CNC Precision Bracket.",
      link: `/products`,
      isRead: false,
    },
    {
      type: "support_ticket_replied",
      title: "Support Team Replied",
      message:
        "Our support team has replied to your ticket about payment not reflecting.",
      link: `/support`,
      isRead: true,
    },
    {
      type: "payment_received",
      title: "Payment Confirmed",
      message:
        "Your payment of PKR 700,000 for the CNC bracket order has been confirmed.",
      link: `/customer/orders`,
      isRead: true,
    },
    {
      type: "verification_approved",
      title: "Account Verified",
      message:
        "Your customer account has been verified. You can now access all platform features.",
      link: `/dashboard`,
      isRead: true,
    },
  ];

  for (const n of fixedNotifData) {
    await notify(
      fixedCustomer._id,
      n.type,
      n.title,
      n.message,
      n.link,
      null,
      null,
      n.isRead,
    );
  }

  // Fixed manufacturer notifications (rich set)
  const fixedMfgNotifData = [
    {
      type: "order_placed",
      title: "New Order Received!",
      message:
        "Ahmed Khan has placed an order for 200x CNC Precision Brackets. Total value: PKR 700,000.",
      link: `/manufacturer/orders`,
      isRead: true,
    },
    {
      type: "order_placed",
      title: "New Order Received!",
      message:
        "Ahmed Khan has placed an order for 75x Sheet Metal Enclosures. Please review and accept.",
      link: `/manufacturer/orders`,
      isRead: true,
    },
    {
      type: "rfq_created",
      title: "New RFQ Available",
      message:
        "A new RFQ for 500 Injection Molded ABS Cover Panels has been posted. Submit your bid before the deadline.",
      link: `/manufacturer/rfqs`,
      isRead: false,
    },
    {
      type: "bid_accepted",
      title: "Your Bid Was Accepted!",
      message:
        "Ahmed Khan has accepted your bid of PKR 162,000 for the Custom Hydraulic Manifold Block RFQ.",
      link: `/manufacturer/bids`,
      isRead: true,
    },
    {
      type: "payment_received",
      title: "Payment Received",
      message:
        "Payment of PKR 162,000 has been received for the Hydraulic Manifold Block order.",
      link: `/manufacturer/orders`,
      isRead: true,
    },
    {
      type: "dispute_opened",
      title: "Dispute Filed Against Your Order",
      message:
        "A customer has filed a dispute regarding quality issues with the welded steel frames. Please respond within 48 hours.",
      link: `/manufacturer/disputes`,
      isRead: false,
    },
    {
      type: "question_asked",
      title: "New Product Question",
      message:
        "A customer has asked: 'Can you confirm the tolerance level for the CNC machined parts?'",
      link: `/manufacturer/products`,
      isRead: true,
    },
    {
      type: "support_ticket_replied",
      title: "Support Response",
      message:
        "Admin has replied to your support ticket about verification documents.",
      link: `/support`,
      isRead: false,
    },
    {
      type: "group_buy_joined",
      title: "Customer Joined Your Group Buy!",
      message:
        "A customer has joined your fastener group buy campaign. Total participants: 8.",
      link: `/manufacturer/group-buys`,
      isRead: true,
    },
    {
      type: "group_buy_tier_reached",
      title: "Group Buy Tier 2 Reached!",
      message:
        "Your fastener group buy has reached Tier 2 (1,000+ units). New price is PKR 1,020/unit.",
      link: `/manufacturer/group-buys`,
      isRead: true,
    },
    {
      type: "verification_approved",
      title: "Business Verified!",
      message:
        "Congratulations! TechForge Industries has been verified. Your products are now visible to all customers.",
      link: `/manufacturer/dashboard`,
      isRead: true,
    },
    {
      type: "order_in_production",
      title: "Order Status Updated",
      message:
        "Order milestone 'Rough Machining' has been marked complete for the Hydraulic Manifold Block order.",
      link: `/manufacturer/orders`,
      isRead: true,
    },
    {
      type: "new_message",
      title: "New Message from Customer",
      message:
        "Ahmed Khan has sent you a message regarding the Sheet Metal Enclosure order.",
      link: `/chat`,
      isRead: false,
    },
  ];

  for (const n of fixedMfgNotifData) {
    await notify(
      fixedManufacturer._id,
      n.type,
      n.title,
      n.message,
      n.link,
      null,
      null,
      n.isRead,
    );
  }

  // Notifications for all orders
  for (const order of allOrders) {
    const isRead = randomBool(0.7);
    await notify(
      order.manufacturerId,
      "order_placed",
      "New Order Received",
      `You have received a new order #${order.orderNumber || "N/A"}`,
      `/manufacturer/orders/${order._id}`,
      "order",
      order._id,
      isRead,
    );

    if (
      ["accepted", "in_production", "shipped", "completed"].includes(
        order.status,
      )
    ) {
      await notify(
        order.customerId,
        "order_accepted",
        "Order Accepted",
        `Your order has been accepted by the manufacturer.`,
        `/customer/orders/${order._id}`,
        "order",
        order._id,
        randomBool(0.7),
      );
    }

    if (order.status === "shipped") {
      await notify(
        order.customerId,
        "order_shipped",
        "Order Shipped!",
        `Your order has been shipped. Tracking: ${order.trackingNumber || "N/A"}`,
        `/customer/orders/${order._id}`,
        "order",
        order._id,
        randomBool(0.6),
      );
    }
  }

  // Notifications for bids
  for (const bid of allBids.slice(0, 80)) {
    const rfq = await RFQ.findById(bid.rfqId).lean();
    if (!rfq) continue;
    await notify(
      rfq.customerId,
      "bid_received",
      "New Bid Received",
      `A manufacturer has submitted a new bid on your RFQ.`,
      `/customer/rfqs/${rfq._id}/bids`,
      "bid",
      bid._id,
      randomBool(0.65),
    );

    if (bid.status === "accepted") {
      await notify(
        bid.manufacturerId,
        "bid_accepted",
        "Your Bid Was Accepted!",
        `The customer has accepted your bid. An order will be placed shortly.`,
        `/manufacturer/bids/${bid._id}`,
        "bid",
        bid._id,
        randomBool(0.8),
      );
    }
  }

  // Extra random notifications per user
  const randomUsers = [...allCustomers, ...allManufacturers];
  const extraNotifTypes = [
    {
      type: "system",
      title: "Platform Maintenance Notice",
      message:
        "CraftIt will undergo scheduled maintenance on Sunday 2-4 AM PKT.",
    },
    {
      type: "new_message",
      title: "New Message",
      message: "You have a new unread message in your inbox.",
    },
    {
      type: "payment_received",
      title: "Payment Processed",
      message: "Your payment has been successfully processed.",
    },
    {
      type: "order_completed",
      title: "Order Completed",
      message: "An order has been marked as completed.",
    },
  ];

  for (const user of randomUsers) {
    const count = randomInt(
      CONFIG.NOTIFICATIONS_PER_USER.min,
      CONFIG.NOTIFICATIONS_PER_USER.max,
    );
    for (let i = 0; i < count; i++) {
      const data = randomItem(extraNotifTypes);
      await notify(
        user._id,
        data.type,
        data.title,
        data.message,
        "/dashboard",
        null,
        null,
        randomBool(0.6),
      );
    }
  }

  console.log(`✓ Created ${notifications.length} notifications`);
  return notifications;
}

// ============================================================================
// 15. CREATE ADMIN LOGS
// ============================================================================
async function createAdminLogs(
  admin,
  allManufacturers,
  allDisputes,
  allOrders,
) {
  console.log("Creating admin logs...");
  const logs = [];

  // Manufacturer verification logs
  for (const mfg of allManufacturers) {
    if (mfg.verificationStatus === "verified") {
      const log = await AdminLog.create({
        adminId: admin._id,
        action: "manufacturer_approved",
        targetType: "manufacturer",
        targetId: mfg._id,
        description: `Approved manufacturer: ${mfg.businessName || mfg.name}`,
        details:
          "All verification documents reviewed and found valid. NTN, SECP, and Chamber certificates verified.",
        ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
      });
      logs.push(log);
    } else if (mfg.verificationStatus === "suspended") {
      const log = await AdminLog.create({
        adminId: admin._id,
        action: "user_suspended",
        targetType: "user",
        targetId: mfg._id,
        description: `Suspended manufacturer account: ${mfg.businessName || mfg.name}`,
        details: "Account suspended due to repeated policy violations.",
        ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
      });
      logs.push(log);
    }
  }

  // Dispute resolution logs
  for (const dispute of allDisputes) {
    if (dispute.status === "resolved") {
      const log = await AdminLog.create({
        adminId: admin._id,
        action: "dispute_resolved",
        targetType: "dispute",
        targetId: dispute._id,
        description: `Resolved dispute ${dispute.disputeNumber}`,
        details: `Resolution: ${dispute.resolution}. Amount: ${dispute.resolutionAmount || "N/A"}`,
        ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
      });
      logs.push(log);
    }
  }

  // Order viewed logs (admin spot checks)
  const spotCheckOrders = faker.helpers.arrayElements(
    allOrders,
    Math.min(15, allOrders.length),
  );
  for (const order of spotCheckOrders) {
    const log = await AdminLog.create({
      adminId: admin._id,
      action: "order_viewed",
      targetType: "order",
      targetId: order._id,
      description: `Admin reviewed order ${order.orderNumber || order._id}`,
      details: "Routine order review",
      ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
    });
    logs.push(log);
  }

  // Support ticket update logs
  for (let i = 0; i < 8; i++) {
    const log = await AdminLog.create({
      adminId: admin._id,
      action: "support_ticket_updated",
      targetType: "support_ticket",
      description: `Support ticket status updated to resolved`,
      details: "Ticket resolved after customer confirmation",
      ipAddress: `192.168.${randomInt(1, 10)}.${randomInt(1, 254)}`,
    });
    logs.push(log);
  }

  console.log(`✓ Created ${logs.length} admin logs`);
  return logs;
}

// ============================================================================
// UPDATE MANUFACTURER STATS
// ============================================================================
async function updateManufacturerStats(
  allOrders,
  allReviews,
  allManufacturers,
) {
  console.log("Updating manufacturer stats...");

  for (const mfg of allManufacturers) {
    const mfgOrders = allOrders.filter(
      (o) => o.manufacturerId.toString() === mfg._id.toString(),
    );
    const completedOrders = mfgOrders.filter((o) => o.status === "completed");
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + o.totalPrice,
      0,
    );

    const mfgReviews = allReviews.filter(
      (r) => r.manufacturerId.toString() === mfg._id.toString(),
    );
    const avgRating =
      mfgReviews.length > 0
        ? mfgReviews.reduce((sum, r) => sum + r.overallRating, 0) /
          mfgReviews.length
        : 0;

    await User.findByIdAndUpdate(mfg._id, {
      stats: {
        totalOrders: mfgOrders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: mfgReviews.length,
      },
    });
  }

  console.log(`✓ Updated stats for ${allManufacturers.length} manufacturers`);
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

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Clear all existing data
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

    // ── STEP 1: Fixed accounts ──────────────────────────────────────────────
    const {
      admin,
      customer: fixedCustomer,
      manufacturer: fixedManufacturer,
    } = await createFixedAccounts();

    // ── STEP 2: Extra users ─────────────────────────────────────────────────
    const { customers: extraCustomers, manufacturers: extraManufacturers } =
      await createExtraUsers(admin);

    const allManufacturers = [fixedManufacturer, ...extraManufacturers];
    const allCustomers = [fixedCustomer, ...extraCustomers];

    // ── STEP 3: Verification Documents ─────────────────────────────────────
    await createVerificationDocuments(allManufacturers, admin);

    // ── STEP 4: Products ────────────────────────────────────────────────────
    const fixedProducts =
      await createFixedManufacturerProducts(fixedManufacturer);
    const extraProducts = await createExtraProducts(extraManufacturers);
    const allProducts = [...fixedProducts, ...extraProducts];

    // ── STEP 5: Product Questions ───────────────────────────────────────────
    await createProductQuestions(
      allProducts,
      fixedCustomer,
      fixedManufacturer,
      allCustomers,
    );

    // ── STEP 6: Fixed Account Orders (all types + disputes) ─────────────────
    const fixedData = await createFixedAccountOrders(
      fixedCustomer,
      fixedManufacturer,
      fixedProducts,
      allProducts,
      extraManufacturers,
    );

    // ── STEP 7: Extra RFQ workflow ──────────────────────────────────────────
    const extraRFQData = await createExtraRFQWorkflow(
      extraCustomers,
      allManufacturers,
      allProducts,
    );

    // ── STEP 8: Extra Group Buys ────────────────────────────────────────────
    const extraGroupBuys = await createExtraGroupBuys(
      allManufacturers,
      allProducts,
    );

    // ── STEP 9: Extra Orders ────────────────────────────────────────────────
    const extraOrders = await createExtraOrders(
      extraCustomers,
      allManufacturers,
      allProducts,
      extraRFQData.rfqs,
      extraRFQData.bids,
    );

    const allOrders = [...fixedData.orders, ...extraOrders];
    const allBids = [...fixedData.bids, ...extraRFQData.bids];
    const allGroupBuys = [...fixedData.groupBuys, ...extraGroupBuys];

    // ── STEP 10: Reviews ────────────────────────────────────────────────────
    const allReviews = await createReviews(allOrders);

    // ── STEP 11: Extra Disputes ─────────────────────────────────────────────
    const extraDisputes = await createExtraDisputes(extraOrders, admin);
    const allDisputes = [...fixedData.disputes, ...extraDisputes];

    // Update resolved disputes with admin ID
    for (const dispute of allDisputes) {
      if (dispute.status === "resolved" && !dispute.resolvedBy) {
        await Dispute.findByIdAndUpdate(dispute._id, { resolvedBy: admin._id });
      }
    }

    // ── STEP 12: Chats & Messages ───────────────────────────────────────────
    await createChatsAndMessages(
      fixedCustomer,
      fixedManufacturer,
      fixedData.orders,
      fixedData.bids,
      extraRFQData.bids,
      extraOrders,
    );

    // ── STEP 13: Support Tickets ────────────────────────────────────────────
    await createSupportTickets(
      fixedCustomer,
      fixedManufacturer,
      admin,
      extraCustomers,
      extraManufacturers,
    );

    // ── STEP 14: Notifications ──────────────────────────────────────────────
    await createNotifications(
      fixedCustomer,
      fixedManufacturer,
      fixedData.orders,
      fixedData.bids,
      allOrders,
      allBids,
      extraCustomers,
      extraManufacturers,
    );

    // ── STEP 15: Admin Logs ─────────────────────────────────────────────────
    await createAdminLogs(admin, allManufacturers, allDisputes, allOrders);

    // ── STEP 16: Update Manufacturer Stats ──────────────────────────────────
    await updateManufacturerStats(allOrders, allReviews, allManufacturers);

    // ── STEP 17: Verify Fixed Accounts are Active ───────────────────────────
    console.log("Verifying fixed accounts are active...");
    await User.updateMany(
      {
        email: {
          $in: [
            FIXED.admin.email,
            FIXED.customer.email,
            FIXED.manufacturer.email,
          ],
        },
      },
      { $set: { isActive: true } },
    );
    console.log("✓ Fixed accounts verified and activated");

    // ── SUMMARY ──────────────────────────────────────────────────────────────
    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Admin: 1 (fixed)`);
    console.log(
      `   Customers: ${allCustomers.length} (1 fixed + ${extraCustomers.length} extra)`,
    );
    console.log(
      `   Manufacturers: ${allManufacturers.length} (1 fixed + ${extraManufacturers.length} extra)`,
    );
    console.log(
      `   Products: ${allProducts.length} (${fixedProducts.length} fixed manufacturer + ${extraProducts.length} extra)`,
    );
    console.log(
      `   Custom Orders: ${fixedData.customOrders.length + extraRFQData.customOrders.length}`,
    );
    console.log(`   RFQs: ${fixedData.rfqs.length + extraRFQData.rfqs.length}`);
    console.log(`   Bids: ${allBids.length}`);
    console.log(`   Group Buys: ${allGroupBuys.length}`);
    console.log(`   Orders: ${allOrders.length}`);
    console.log(`   Reviews: ${allReviews.length}`);
    console.log(`   Disputes: ${allDisputes.length}`);

    console.log("\n🔐 Fixed Account Credentials:");
    console.log(
      `   Admin:        ${FIXED.admin.email} / ${FIXED.admin.password}`,
    );
    console.log(
      `   Customer:     ${FIXED.customer.email} / ${FIXED.customer.password}`,
    );
    console.log(
      `   Manufacturer: ${FIXED.manufacturer.email} / ${FIXED.manufacturer.password}`,
    );

    console.log("\n📌 Fixed Account Relations:");
    console.log(
      "   ✓ Customer ↔ Manufacturer: 7+ orders (all statuses + types)",
    );
    console.log(
      "   ✓ Product orders: completed, in_production, shipped, pending, cancelled",
    );
    console.log(
      "   ✓ RFQ order: customer posted RFQ → manufacturer bid won → order in production",
    );
    console.log(
      "   ✓ Group buy order: customer joined active group buy campaign",
    );
    console.log(
      "   ✓ Open dispute: quality issue on welded frames (manufacturer_responded)",
    );
    console.log(
      "   ✓ Resolved dispute: wrong items on brass fittings (partial refund)",
    );
    console.log(
      "   ✓ Product Q&A: 5 questions from customer on manufacturer products",
    );
    console.log(
      "   ✓ Reviews: customer review on completed order with manufacturer response",
    );
    console.log("   ✓ Chats: multiple conversations between fixed accounts");
    console.log(
      "   ✓ Support tickets: customer & manufacturer tickets with admin replies",
    );
    console.log("   ✓ Active RFQ with 1 pending bid from manufacturer");
    console.log(
      "   ✓ 3 Group Buy campaigns from fixed manufacturer (active, completed, scheduled)",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
