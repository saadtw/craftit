// lib/constants.js

export const CATEGORIES = [
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
  "Other" // Added a fallback category
];

export const ORDER_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "cancellation_requested", label: "Cancellation Requested" },
  { value: "accepted", label: "Accepted" },
  { value: "in_production", label: "In Production" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "disputed", label: "Disputed" }
];

export const CUSTOM_ORDER_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "rfq_created", label: "RFQ Created" },
  { value: "order_placed", label: "Order Placed" }
];

export const RFQ_STATUSES = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "bid_accepted", label: "Bid Accepted" },
  { value: "cancelled", label: "Cancelled" }
];

export const GROUP_BUY_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "payment_processing", label: "Payment Processing" },
  { value: "mvq_review", label: "MVQ Review" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" }
];

export const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_user", label: "Waiting for User" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

export const BID_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "under_consideration", label: "Under Consideration" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" }
];

export const PRODUCT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "archived", label: "Archived" }
];

export const DISPUTE_STATUSES = [
  { value: "open", label: "Open" },
  { value: "manufacturer_responded", label: "Manufacturer Responded" },
  { value: "under_review", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

export const USER_VERIFICATION_STATUSES = [
  { value: "unverified", label: "Unverified" },
  { value: "verified", label: "Verified" },
  { value: "suspended", label: "Suspended" }
];
