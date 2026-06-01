# Craftit — Payment, Escrow, Dispute & Group Buy Implementation Prompt

> **Purpose:** This document is a complete specification and implementation guide for the
> Craftit B2B manufacturing marketplace. It covers architecture decisions, confirmed existing
> features (do not re-implement), required bug fixes, model changes, new API routes, and UI
> additions. Follow the sprint order. Do not skip model changes before touching routes.

---

## 1. Project Context

Craftit is a Next.js 14 + MongoDB (Mongoose) B2B manufacturing marketplace where:

- **Customers** post RFQs or browse products from manufacturers
- **Manufacturers** list products, submit bids, and create group-buy campaigns
- **Admin** oversees orders, disputes, and financial releases
- Auth via NextAuth. Stripe for payments. Supabase for file storage.
- All API routes live in `app/api/`. All models in `models/`. Helper services in `services/`.
- Payment resolution uses `resolveRequestSession` from `lib/requestAuth.js`, NOT `getServerSession` directly.

### Target users
Pakistani manufacturers and customers. Stripe is used in **sandbox/test mode only** for demo.
Pakistani customers can pay via internationally-enabled Visa/Mastercard through Stripe.
Pakistani manufacturers cannot receive Stripe live payouts — admin handles releases via the
Escrow Dashboard (Stripe Connect in sandbox for demo, bank transfer in production).

### Stripe strategy (confirmed architecture)
```
Customer (Stripe test card)
  → Payment Authorized
  → Payment Captured
  → Held in Platform Escrow (Stripe platform account)
  → Admin reviews and approves release
  → Stripe Connect transfer to manufacturer test account   ← sandbox demo
    OR admin marks as paid externally (bank/JazzCash)      ← production fallback
```

Stripe Connect sandbox accounts can be created and used for demo regardless of Pakistan
restrictions. Manufacturers onboard via Settings → Payouts tab (already implemented).

---

## 2. What Is Already Implemented — Do NOT Re-implement

These are confirmed working from code audit. Touching them risks overwriting working logic.

| Feature | File | Notes |
|---|---|---|
| Stripe Connect manufacturer onboarding | `app/api/users/[id]/payouts/connect/route.js` | Full Express account creation, onboarding link, status check, dashboard link, saves `stripeConnectAccountId` |
| Manufacturer payout settings UI | `components/settings/StripeConnectPayoutsTab.js` | Complete UI — do not recreate |
| PaymentReleaseRequest model | `models/PaymentReleaseRequest.js` | Has: orderId, manufacturerId, customerId, amount, reason, proofUrls, status, expiresAt, resolvedAt, transferId, scheduleRef |
| Payment release POST (manufacturer creates request) | `app/api/orders/[id]/payment-release/route.js` | Needs bug fix only (see §4, Fix 2) |
| Payment release PATCH (customer approves/rejects) | `app/api/orders/[id]/payment-release/[releaseId]/route.js` | Needs conditional Connect fix only |
| Auto-approve cron | `app/api/cron/auto-approve-releases/route.js` | Needs conditional Connect fix only |
| Payment webhook handler | `app/api/payments/webhook/route.js` | Complete — handles payment_intent, charge, transfer, account events |
| Dispute model | `models/Dispute.js` | Full schema with customer + manufacturer issue types |
| Dispute CRUD routes | `app/api/disputes/` | POST, GET, PATCH all exist |
| Dispute messaging (SSE) | `app/api/disputes/[id]/messages/` | Complete streaming message thread |
| Admin dispute list + detail | `app/admin/disputes/` | Complete pages |
| Customer dispute UI | Customer dispute pages | Complete |
| Manufacturer dispute response | Manufacturer dispute pages | Complete |
| Production-ack route | `app/api/orders/[id]/production-ack/route.js` | Customer pays remaining balance for group buy partial orders — complete |
| Payment schedule (instalments) | `models/PaymentSchedule.js` + route | Milestone-based instalments for RFQ — complete |
| Order ship route | `app/api/orders/[id]/ship/route.js` | Complete — sets status to `shipped` |
| Notification service | `services/notificationService.js` | Has: groupBuyJoined, groupBuyFunded, groupBuyCompleted, groupBuyCancelled, paymentReceived, disputeOpened, paymentReleaseRequested, paymentReleaseApproved, paymentReleaseRejected, paymentReleaseAutoApproved |

---

## 3. Model Changes

**Do all model changes first, before touching any routes.**

### 3.1 `models/Order.js` — extend `paymentStatus` enum

Current enum:
```js
["pending", "authorized", "captured", "refunded", "partially_refunded"]
```

Replace with:
```js
[
  "pending",
  "authorized",
  "captured",
  "held_in_escrow",      // NEW — set after successful capture (replaces staying at "captured")
  "release_requested",   // NEW — set when active PaymentReleaseRequest exists
  "released",            // NEW — set when admin confirms payout or Stripe transfer succeeds
  "refunded",
  "partially_refunded",
]
```

### 3.2 `models/Order.js` — extend `status` enum

Current enum:
```js
["pending_acceptance", "awaiting_production_ack", "accepted", "in_production",
 "shipped", "completed", "cancelled", "disputed"]
```

Add `"delivered"` between `"shipped"` and `"completed"`:
```js
["pending_acceptance", "awaiting_production_ack", "accepted", "in_production",
 "shipped", "delivered", "completed", "cancelled", "disputed"]
```

Also add these fields to `OrderSchema`:
```js
// Delivery tracking
deliveredAt: { type: Date },
deliveryConfirmedBy: { type: String, enum: ["customer", "auto"] },

// Dispute window
disputeWindowClosedAt: { type: Date },  // set on delivery; disputes blocked after this
```

### 3.3 `models/GroupBuy.js` — add MVQ and participant status

Add to the main `GroupBuySchema` (alongside existing `minParticipants`, `maxParticipants`):
```js
minimumViableQuantity: {
  type: Number,
  default: 0,
  min: 0,
  // 0 = no minimum (all participants get orders regardless of total count)
  // >0 = minimum total units needed; if not met after campaign ends, all authorizations voided
},
```

Add to the existing `ParticipantSchema`:
```js
status: {
  type: String,
  enum: ["authorized", "capture_failed", "paid", "cancelled"],
  default: "authorized",
},
captureAttemptedAt: { type: Date },
captureFailedAt:    { type: Date },
captureRetryDeadline: { type: Date },  // captureFailedAt + 24 hours
```

### 3.4 `models/PaymentReleaseRequest.js` — add payout tracking fields

Add to the existing schema:
```js
// Admin payout tracking
payoutMethod: {
  type: String,
  enum: ["stripe_connect", "jazzcash", "bank_transfer", "easypaisa", "manual", "none"],
  default: "none",
},
externalReferenceId: { type: String },  // JazzCash TxID, bank ref number, etc.
paidAt:              { type: Date },     // timestamp when admin confirmed payment was sent
adminNote:           { type: String },   // optional admin note when marking paid
```

### 3.5 `models/Dispute.js` — add manufacturer resolution values

Current `desiredResolution` enum:
```js
["full_refund", "partial_refund", "replacement", "other"]
```

Replace with:
```js
["full_refund", "partial_refund", "replacement", "other",
 "release_payment", "partial_release"]  // NEW — manufacturer-initiated dispute resolutions
```

### 3.6 New model — `models/EscrowTransaction.js`

Create this file:
```js
import mongoose from "mongoose";

const EscrowTransactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        "payment_received",   // customer payment captured
        "held",               // confirmed in escrow
        "release_requested",  // manufacturer requested release
        "released",           // funds paid out to manufacturer
        "refunded",           // refund issued to customer
        "adjustment",         // admin correction
        "capture_failed",     // group buy capture failure
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    reference: { type: String },  // Stripe paymentIntentId, transferId, refundId, or bank ref
    notes:     { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },  // admin for manual entries
  },
  { timestamps: true }
);

EscrowTransactionSchema.index({ type: 1, createdAt: -1 });
EscrowTransactionSchema.index({ manufacturerId: 1, type: 1 });

export default mongoose.models.EscrowTransaction ||
  mongoose.model("EscrowTransaction", EscrowTransactionSchema);
```

---

## 4. Critical Bug Fixes

**These fix broken functionality in the existing codebase. Do these immediately after model changes.**

### Fix 1 — Group buy orders missing `paymentIntentId`

**File:** `app/api/group-buys/[id]/join/route.js`

When orders are auto-created (around lines 198–210), the `Order.create()` call does not copy
`paymentIntentId` from the participant. This means any future refund or release on a group buy
order has no Stripe handle.

Find the `Order.create({...})` call inside the group completion block and add:
```js
paymentIntentId: participant.paymentIntentId,  // ADD THIS LINE
```

### Fix 2 — Remove Stripe Connect hard-block from payment release POST

**File:** `app/api/orders/[id]/payment-release/route.js`

Remove this entire block (currently around lines 28–35):
```js
// REMOVE THIS ENTIRE BLOCK:
if (process.env.STRIPE_SECRET_KEY) {
  const User = (await import("@/models/User")).default;
  const manufacturer = await User.findById(session.user.id).select("stripeConnectAccountId");
  if (!manufacturer?.stripeConnectAccountId) {
    return NextResponse.json(
      { error: "You must complete Stripe onboarding before requesting payment release." },
      { status: 400 }
    );
  }
}
```

The transfer fires conditionally in the customer-approval route (Fix 3). No need to block at
request-creation time. Manufacturers can request release regardless of Connect status.

After removing the block, also update the payment status when a release request is created:
```js
// After PaymentReleaseRequest.create(...)
order.paymentStatus = "release_requested";
await order.save();
```

Also log an EscrowTransaction:
```js
await EscrowTransaction.create({
  orderId: order._id,
  customerId: order.customerId,
  manufacturerId: order.manufacturerId,
  amount: release.amount,
  type: "release_requested",
  reference: release._id.toString(),
});
```

### Fix 3 — Make Stripe Connect transfer conditional in auto-approve cron

**File:** `app/api/cron/auto-approve-releases/route.js`

The cron currently hard-throws if `manufacturer.stripeConnectAccountId` is missing. It should
still mark the release as auto-approved and flag it for admin manual payout.

Replace the transfer block with:
```js
const User = (await import("@/models/User")).default;
const manufacturer = await User.findById(release.manufacturerId).select("stripeConnectAccountId");

if (manufacturer?.stripeConnectAccountId && process.env.STRIPE_SECRET_KEY) {
  try {
    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: Math.round(release.amount * 100),
      currency: "usd",
      destination: manufacturer.stripeConnectAccountId,
      transfer_group: release.orderId.toString(),
    });
    release.transferId = transfer.id;
    release.payoutMethod = "stripe_connect";
    // Update order
    await Order.findByIdAndUpdate(release.orderId, { paymentStatus: "released" });
    // Log EscrowTransaction
    await EscrowTransaction.create({ ..., type: "released", reference: transfer.id });
  } catch (stripeErr) {
    console.error("Auto-approve transfer failed, queuing for manual payout:", stripeErr.message);
    release.payoutMethod = "manual";
    await Order.findByIdAndUpdate(release.orderId, { paymentStatus: "release_requested" });
  }
} else {
  // No Connect account — queue for admin manual payout
  release.payoutMethod = "manual";
  await Order.findByIdAndUpdate(release.orderId, { paymentStatus: "release_requested" });
}

release.status = "auto_approved";  // Always set this, regardless of transfer outcome
release.resolvedAt = new Date();
await release.save();
// Notify manufacturer regardless
```

### Fix 4 — Make Stripe transfer conditional in admin dispute resolve

**File:** `app/api/disputes/[id]/route.js`

In the `admin_resolve` action, when `resolution === "side_with_manufacturer"`, the current code
fires a `stripe.transfers.create()` that hard-throws if the manufacturer has no Connect account,
preventing the order from ever being marked completed.

Replace the transfer section with:
```js
if (resolution === "side_with_manufacturer" || resolution === "release_payment") {
  const User = (await import("@/models/User")).default;
  const manufacturer = await User.findById(dispute.manufacturerId).select("stripeConnectAccountId");

  if (manufacturer?.stripeConnectAccountId && order.paymentIntentId && getStripe()) {
    try {
      const transfer = await getStripe().transfers.create({
        amount: Math.round(order.totalPrice * 100),
        currency: "usd",
        destination: manufacturer.stripeConnectAccountId,
        transfer_group: order._id.toString(),
      });
      order.paymentStatus = "released";
      await EscrowTransaction.create({ ..., type: "released", reference: transfer.id });
    } catch (stripeErr) {
      console.error("Dispute transfer failed, queueing for admin payout:", stripeErr.message);
      order.paymentStatus = "release_requested";  // Admin manually releases via dashboard
    }
  } else {
    order.paymentStatus = "release_requested";  // Admin manually releases via dashboard
  }
  order.status = "completed";  // Always update status
}
```

### Fix 5 — Role-validate manufacturer dispute issue types

**File:** `app/api/disputes/route.js` (POST handler)

Add after order ownership verification, before creating the dispute:
```js
const MANUFACTURER_ONLY_ISSUES = ["payment_release_rejected", "customer_unresponsive"];
const CUSTOMER_ONLY_ISSUES = [
  "item_not_received", "item_not_as_described", "quality_issue",
  "wrong_item", "damaged_item", "late_delivery", "refund_not_received",
];

if (session.user.role === "customer" && MANUFACTURER_ONLY_ISSUES.includes(issueType)) {
  return NextResponse.json({ error: "Invalid issue type for customers." }, { status: 400 });
}
if (session.user.role === "manufacturer" && CUSTOMER_ONLY_ISSUES.includes(issueType)) {
  return NextResponse.json({ error: "Invalid issue type for manufacturers." }, { status: 400 });
}
```

---

## 5. Group Buy Architecture Overhaul

**This changes when customers are charged.** Currently: captured immediately on join.
New design: authorized on join, captured only after the group campaign ends and MVQ is verified.

### 5.1 Change join route to authorize-only

**File:** `app/api/group-buys/[id]/join/route.js`

**Remove** the Stripe capture block (the section starting with `if (isStripeEnabled() && paymentIntentId)` that calls `stripe.paymentIntents.capture()`). The intent must already be in `requires_capture` state from the frontend — just validate that it is, but do not capture yet.

**Remove** the entire order-creation block that fires when `maxParticipants` is hit. Order creation now happens exclusively in the completion cron (§5.2).

**Remove** the `joinHoldPercent` partial-capture logic. In the new design, 100% of `totalPrice` is authorized; `remainingBalance = 0`.

**Keep:**
- Participant creation with `paymentIntentId` stored
- The `stripe.paymentIntents.retrieve()` validation confirming `status === "requires_capture"`
- Participant status set to `"authorized"` (new field from §3.3)

When `maxParticipants` is reached, instead of creating orders, just set:
```js
groupBuy.status = "payment_processing";  // add this to GroupBuy status enum too
```
The cron will handle order creation. Notify the manufacturer that the campaign is full.

Add `"payment_processing"` and `"failed"` to the GroupBuy `status` enum (alongside existing
`"active"`, `"completed"`, `"cancelled"`).

### 5.2 New cron — `app/api/cron/complete-group-buys/route.js`

**Create this file.** Add it to `vercel.json` cron schedule to run every hour.

This cron is the heart of the group buy payment system. Full logic:

```
Step 1 — Find eligible campaigns
  Query: GroupBuy.find({
    status: "active",
    $or: [
      { endDate: { $lte: new Date() } },         // expired by date
      // maxParticipants hit is handled by setting status to "payment_processing" in join route
    ]
  })
  Also include: { status: "payment_processing" }

Step 2 — For each campaign, attempt to capture all "authorized" participants
  For each participant where status === "authorized":
    try:
      await stripe.paymentIntents.capture(participant.paymentIntentId)
      participant.status = "paid"
      Log EscrowTransaction { type: "payment_received" + "held" }
    catch:
      participant.status = "capture_failed"
      participant.captureFailedAt = now
      participant.captureRetryDeadline = now + 24 hours
      Log EscrowTransaction { type: "capture_failed" }
      Notify customer: "Payment failed — update your payment method within 24 hours"

Step 3 — Wait for retry window
  Participants with status "capture_failed" and captureRetryDeadline in the future are
  left for the next cron run. On the next run, attempt retry if customer updated
  payment method (they'll create a new PaymentIntent via the retry UI — §7.3).

Step 4 — Check if retry deadline has passed
  Participants with status "capture_failed" and captureRetryDeadline < now:
    participant.status = "cancelled"
    await stripe.paymentIntents.cancel(participant.paymentIntentId)
    Notify customer: "Your spot has been cancelled due to payment failure"

Step 5 — Check Minimum Viable Quantity (MVQ)
  paidQuantity = sum of (participant.quantity for all participants where status === "paid")
  
  IF groupBuy.minimumViableQuantity > 0 AND paidQuantity < groupBuy.minimumViableQuantity:
    // Group buy fails
    groupBuy.status = "cancelled"
    groupBuy.cancelReason = "minimum_viable_quantity_not_met"
    For each participant where status === "paid":
      await stripe.refunds.create({ payment_intent: participant.paymentIntentId })
      participant.status = "cancelled"
    Notify all participants: "Group buy cancelled — minimum quantity not met, full refund issued"
    RETURN (no orders created)

Step 6 — Create orders for paid participants
  groupBuy.status = "completed"
  For each participant where status === "paid":
    await Order.create({
      orderType: "group_buy",
      groupBuyId: groupBuy._id,
      customerId: participant.customerId,
      manufacturerId: groupBuy.manufacturerId,
      productId: groupBuy.productId,
      quantity: participant.quantity,
      totalPrice: participant.totalPrice,
      paymentIntentId: participant.paymentIntentId,  // CRITICAL — always set this
      paymentStatus: "held_in_escrow",
      status: "accepted",                            // implicit acceptance for group buys
    })
  Notify manufacturer: "Group buy complete — X orders created"
  Notify each customer: "Your group buy order has been created — order #XXXX"
```

### 5.3 Add MVQ field to group buy creation

**File:** Manufacturer's create group buy form page + `POST /api/group-buys/route.js`

Add an optional "Minimum Viable Quantity" number field to the form. If blank, send `0`.
The API must accept and save `minimumViableQuantity` to the GroupBuy document.

---

## 6. Delivered Status + Dispute Windows

### 6.1 New route — `app/api/orders/[id]/deliver/route.js`

**Create this file.** Called by customer to confirm delivery.

```
POST /api/orders/[id]/deliver
Auth: customer only, must own the order
Validates: order.status === "shipped"

On success:
  order.status = "delivered"
  order.deliveredAt = new Date()
  order.deliveryConfirmedBy = "customer"
  
  // Set dispute window: closes 7 days after delivery (per spec)
  const windowClose = new Date()
  windowClose.setDate(windowClose.getDate() + 7)
  order.disputeWindowClosedAt = windowClose

  await order.save()
  
  // Notify manufacturer
  notify.orderDelivered(order.manufacturerId, order._id, order.orderNumber)
  // Prompt manufacturer: payment is now releasable

Response: { success: true, deliveredAt, disputeWindowClosedAt }
```

Also add `notify.orderDelivered` to `services/notificationService.js` if it doesn't exist.

### 6.2 Auto-delivered cron — `app/api/cron/auto-deliver/route.js`

Prevents customers from blocking payment indefinitely by never confirming delivery.

```
Runs daily.
Find orders where:
  status === "shipped"
  estimatedDelivery < (now - 3 days)   // 3 days past estimated delivery

For each:
  order.status = "delivered"
  order.deliveredAt = new Date()
  order.deliveryConfirmedBy = "auto"
  
  disputeWindowClose = deliveredAt + 7 days
  order.disputeWindowClosedAt = disputeWindowClose
  
  Notify customer: "Your order has been marked as delivered automatically"
  Notify manufacturer: "Order auto-marked delivered — payment releasable"
```

Add to `vercel.json` cron schedule.

### 6.3 Add dispute window enforcement to `POST /api/disputes`

**File:** `app/api/disputes/route.js`

Add after order lookup:

```js
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";

// --- Customer dispute window check ---
if (session.user.role === "customer") {
  // If order has been delivered and window has closed, block dispute
  if (order.disputeWindowClosedAt && new Date() > order.disputeWindowClosedAt) {
    return NextResponse.json(
      { error: "Dispute window has closed. Disputes must be opened within 7 days of delivery." },
      { status: 400 }
    );
  }
  // If order is completed without delivery tracking, use completedAt + 7 days
  if (order.status === "completed" && !order.deliveredAt) {
    const fallbackWindow = new Date(order.updatedAt);
    fallbackWindow.setDate(fallbackWindow.getDate() + 7);
    if (new Date() > fallbackWindow) {
      return NextResponse.json(
        { error: "Dispute window has closed." },
        { status: 400 }
      );
    }
  }
}

// --- Manufacturer dispute pre-condition check ---
if (session.user.role === "manufacturer") {
  const rejectedRelease = await PaymentReleaseRequest.findOne({
    orderId,
    status: "rejected",
  }).sort({ resolvedAt: -1 });

  const expiredPendingRelease = await PaymentReleaseRequest.findOne({
    orderId,
    status: "pending",
    expiresAt: { $lt: new Date() },
  });

  if (!rejectedRelease && !expiredPendingRelease) {
    return NextResponse.json(
      {
        error:
          "Manufacturers can only open a dispute after a payment release request has been rejected or has expired without customer response.",
      },
      { status: 400 }
    );
  }

  // Manufacturer dispute window: 3 days after trigger event (per spec)
  const triggerDate =
    rejectedRelease?.resolvedAt || expiredPendingRelease?.expiresAt;
  if (triggerDate) {
    const disputeDeadline = new Date(triggerDate);
    disputeDeadline.setDate(disputeDeadline.getDate() + 3);
    if (new Date() > disputeDeadline) {
      return NextResponse.json(
        {
          error:
            "Manufacturer dispute window has closed (3 days after payment release rejection or expiry).",
        },
        { status: 400 }
      );
    }
  }
}
```

---

## 7. Admin Escrow Dashboard

### 7.1 New API routes

#### `GET /api/admin/escrow/stats`
Returns aggregate financial snapshot:
```js
{
  totalInEscrow:      // sum of totalPrice for orders with paymentStatus in ["captured","held_in_escrow","release_requested"]
  pendingReleases:    // count of PaymentReleaseRequests with status in ["pending","auto_approved"] that have payoutMethod="manual" or payoutMethod="none"
  releasedThisMonth:  // sum from EscrowTransactions where type="released" and createdAt in current month
  refundedThisMonth:  // sum from EscrowTransactions where type="refunded" and createdAt in current month
  activeDisputes:     // count of Disputes where status in ["open","manufacturer_responded","under_review"]
  disputedAmount:     // sum of totalPrice for disputed orders
}
```

#### `GET /api/admin/escrow/releases`
List PaymentReleaseRequests available for admin action.
- Query params: `status` filter, `page`, `limit`
- Populate: orderId (orderNumber, totalPrice), manufacturerId (businessName, email, stripeConnectAccountId), customerId (name, email)
- Default filter: status in `["auto_approved"]` plus `status="approved"` with `payoutMethod="manual"` and `paidAt` not set
- Sort: createdAt ascending (oldest first — pay in order)

#### `PATCH /api/admin/escrow/releases/[id]`
Admin marks a release as paid. Body:
```js
{
  action: "mark_paid" | "stripe_transfer",
  payoutMethod: "bank_transfer" | "jazzcash" | "easypaisa" | "manual",  // for mark_paid
  externalReferenceId: String,  // optional transaction reference
  adminNote: String,            // optional
  amount: Number,               // for partial releases
}
```
On `"stripe_transfer"`:
- Requires manufacturer has `stripeConnectAccountId`
- Calls `stripe.transfers.create()`
- Sets `release.payoutMethod = "stripe_connect"`, `release.transferId`

On `"mark_paid"`:
- Sets `release.payoutMethod`, `release.externalReferenceId`, `release.paidAt = now`, `release.adminNote`

Both actions:
- Set `release.status = "approved"` (if not already)
- Set `order.paymentStatus = "released"`
- Create `EscrowTransaction { type: "released", ... }`
- Notify manufacturer: "Your payment has been released"

#### `GET /api/admin/escrow/transactions`
Full EscrowTransaction ledger.
- Query params: `type`, `manufacturerId`, `page`, `limit`
- Populate: orderId, customerId, manufacturerId, createdBy
- Sort: createdAt descending

### 7.2 New admin page — `app/admin/escrow/page.js`

Build an escrow management dashboard with these sections:

**Summary row (4 stat cards):**
- Total in Escrow (PKR/USD)
- Pending Releases (count + total amount)
- Released This Month
- Refunded This Month

**Pending releases table:**
Columns: Order #, Manufacturer name, Amount, Release type (customer-approved / auto-approved), Requested date, Connect status (has Connect account or not)
Actions per row:
- "Pay via Stripe Connect" — visible if manufacturer has stripeConnectAccountId; calls PATCH with action="stripe_transfer"
- "Mark as Paid Externally" — always visible; opens modal

**Mark as Paid modal:**
```
Fields:
  - Payout Method (select): Bank Transfer | JazzCash | Easypaisa | Manual
  - Reference ID (text, optional): transaction reference from external payment
  - Admin Note (textarea, optional)
  - Amount (number, pre-filled from release request, read-only unless partial)

Submit → PATCH /api/admin/escrow/releases/[id] with action="mark_paid"
```

**Active disputes panel:**
- Brief list of unresolved disputes with frozen amount
- Link to existing `/admin/disputes` for full management

**Transaction ledger:**
- Paginated table of all EscrowTransactions
- Columns: Date, Order #, Type (color-coded), Amount, Reference ID
- Filter by type (held/released/refunded)

Add "Escrow" link to the admin sidebar navigation.

### 7.3 EscrowTransaction logging — where to add it

Add `EscrowTransaction.create(...)` calls at these points:

| Event | Type | File |
|---|---|---|
| Capture succeeds on any order | `"payment_received"` then `"held"` | `app/api/orders/[id]/status/route.js` (after capture in accept handler) |
| Capture succeeds in group buy cron | `"payment_received"` then `"held"` | `app/api/cron/complete-group-buys/route.js` |
| Release request created | `"release_requested"` | `app/api/orders/[id]/payment-release/route.js` |
| Stripe transfer succeeds | `"released"` | `app/api/payments/webhook/route.js` (transfer.created event) |
| Admin marks as paid | `"released"` | `PATCH /api/admin/escrow/releases/[id]` |
| Refund issued | `"refunded"` | `app/api/payments/refund/route.js` |
| Group buy capture fails | `"capture_failed"` | `app/api/cron/complete-group-buys/route.js` |

---

## 8. Manufacturer Dispute UI

### 8.1 Trigger condition

On the manufacturer's order detail page, show an "Open Dispute" button when:

```js
const canOpenDispute =
  order.status !== "cancelled" &&
  order.status !== "disputed" &&
  (
    // A release request was rejected
    latestReleaseRequest?.status === "rejected" ||
    // A release request has expired (pending past expiresAt)
    (latestReleaseRequest?.status === "pending" &&
      new Date(latestReleaseRequest.expiresAt) < new Date())
  );
```

### 8.2 Pre-filled dispute form

When manufacturer clicks "Open Dispute", open the dispute creation form with:

```js
// If rejection:
{ issueType: "payment_release_rejected", desiredResolution: "release_payment" }

// If expiry (customer non-response):
{ issueType: "customer_unresponsive", desiredResolution: "release_payment" }
```

The form should reference the existing dispute creation API `POST /api/disputes`.
Show the pre-filled values as read-only with an explanation of why each was chosen.
Allow manufacturer to add description and upload evidence.

---

## 9. Customer Delivery Confirmation UI

On the customer's order detail page, when `order.status === "shipped"`:

Show a "Confirm Delivery" button with a note: "Confirming delivery starts the 7-day
dispute window. If you have issues with the order, open a dispute first."

On click: `POST /api/orders/[id]/deliver`

After confirmation, show:
- Delivery confirmed timestamp
- Dispute window deadline: `order.disputeWindowClosedAt`
- "Open a Dispute" button (visible until window closes)

For group buy orders, the same flow applies after shipment.

---

## 10. Evidence Upload on Dispute Forms

The project already uses Supabase for file storage (`lib/storage.js`). Add evidence upload
to both the customer dispute creation form and the manufacturer response form.

- Accept: images (jpg/png/webp), PDFs, documents
- On upload: call existing storage utility → get public URL → append to
  `customerEvidence[]` or `manufacturerEvidence[]` array in the dispute payload
- Show thumbnails for images, file icons for PDFs
- Maximum 5 files per party

---

## 11. Manufacturer Payout History Page

**New file:** `app/manufacturer/payouts/page.js`

Shows the manufacturer a history of their payment releases.
- Fetch: `GET /api/orders?manufacturerId=me&paymentStatus=released` + `PaymentReleaseRequest` records
- Table columns: Order #, Amount, Payout Method, Reference ID, Date Released, Order type
- Summary stats: Total released this month / all time
- Status badges: released (green), pending (amber), under_dispute (red)

---

## 12. Dispute Window Policy (Reference)

This is the agreed policy. Enforce it as described in §6.3.

| Party | Window starts | Duration | Condition |
|---|---|---|---|
| Customer (all order types) | `order.deliveredAt` | 7 days | Order must be in delivered/completed status |
| Customer (pre-delivery) | After order accepted | Anytime | Quality/production issues during production |
| Manufacturer | After release rejection | 3 days | Must have rejected PaymentReleaseRequest |
| Manufacturer | After release expiry | 3 days | Must have expired (pending past expiresAt) PaymentReleaseRequest |
| Hard close | — | 60 days after completion | Admin override still allowed |

Admin can always override the dispute window via the admin disputes panel (no code change needed —
admin already bypasses customer-side restrictions).

---

## 13. Sprint Order

Implement in this exact order to avoid dependency issues:

```
Sprint 1 (1 day) — Foundation
  [ ] All model changes (§3)
  [ ] Bug Fix 1: paymentIntentId on group buy orders (§4.1)
  [ ] Bug Fix 2: Remove Connect hard-block from payment release (§4.2)
  [ ] Bug Fix 3: Conditional Connect in auto-approve cron (§4.3)
  [ ] Bug Fix 4: Conditional Connect in dispute resolve (§4.4)
  [ ] Bug Fix 5: Role-validate issue types in dispute POST (§4.5)

Sprint 2 (2–3 days) — Group Buy Overhaul
  [ ] Change join route to authorize-only (§5.1)
  [ ] Create complete-group-buys cron (§5.2)
  [ ] Add MVQ to group buy creation form + API (§5.3)

Sprint 3 (1.5 days) — Delivered Status + Dispute Windows
  [ ] Create /api/orders/[id]/deliver route (§6.1)
  [ ] Create auto-deliver cron (§6.2)
  [ ] Add dispute window enforcement to POST /api/disputes (§6.3)

Sprint 4 (2 days) — Admin Escrow Dashboard
  [ ] Create /api/admin/escrow/stats route (§7.1)
  [ ] Create /api/admin/escrow/releases route (§7.1)
  [ ] Create PATCH /api/admin/escrow/releases/[id] route (§7.1)
  [ ] Create /api/admin/escrow/transactions route (§7.1)
  [ ] Create app/admin/escrow/page.js UI (§7.2)
  [ ] Add EscrowTransaction logging at all 7 capture/release/refund points (§7.3)
  [ ] Add Escrow link to admin sidebar

Sprint 5 (1 day) — Manufacturer Disputes + UI Polish
  [ ] Manufacturer "Open Dispute" button on order detail (§8)
  [ ] Customer "Confirm Delivery" button on order detail (§9)
  [ ] Evidence upload on dispute creation + response forms (§10)
  [ ] Manufacturer payout history page (§11)
```

---

## 14. Stripe Sandbox Setup Checklist (Demo Preparation)

Before the evaluation, complete these steps in Stripe test mode:

1. **Platform account:** Ensure your Stripe test account has `STRIPE_SECRET_KEY` set to the test key (`sk_test_...`)
2. **Manufacturer Connect accounts:** Log in as each demo manufacturer → Settings → Payouts → Connect with Stripe → complete test onboarding (use SSN `000-00-0000`, routing `110000000`, account `000123456789`)
3. **Webhook:** Add `STRIPE_WEBHOOK_SECRET` env var using `stripe listen --forward-to localhost:3000/api/payments/webhook` for local testing
4. **Test cards:** Use `4242 4242 4242 4242` (success), `4000 0000 0000 9995` (capture fails), `4000 0000 0000 0341` (requires_capture then fails)

Demo flow to rehearse:
```
1. Customer joins with test card → authorization created
2. Group buy completes (trigger cron manually for demo: GET /api/cron/complete-group-buys)
3. Orders appear for manufacturer
4. Manufacturer ships order
5. Customer confirms delivery
6. Manufacturer requests payment release
7. Customer approves OR 72h passes → auto-approve
8. Stripe transfer fires to manufacturer Connect test account
9. Admin Escrow Dashboard shows released transaction
```

---

## 15. Key Architectural Principles to Maintain

1. **Payout method agnosticism:** All release logic must go through `PaymentReleaseRequest` →
   `PATCH /api/admin/escrow/releases/[id]`. Never hard-code Stripe as the only payout path.

2. **Graceful Stripe degradation:** Every `stripe.*` call must be wrapped in try/catch. If
   Stripe fails, the system must still update order status and queue for admin action — never
   leave an order in an unresolvable state.

3. **EscrowTransaction as audit trail:** Every money movement (capture, hold, request, release,
   refund) must log an EscrowTransaction. This is the source of truth for financial reporting.

4. **Group buy orders never before payment:** Orders must never be created until `participant.status === "paid"` is confirmed. No exceptions.

5. **Dispute windows are enforced server-side:** Client-side hiding of dispute buttons is for UX
   only. The actual enforcement happens in `POST /api/disputes` as described in §6.3.
