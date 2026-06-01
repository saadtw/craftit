# Implementation Prompt: Bid Submission = Manufacturer Acceptance

## Context & Background

This is a Next.js app with a custom manufacturing RFQ (Request for Quote) system. The current
flow is:

1. Customer creates a custom order → creates an RFQ
2. Manufacturers view RFQs and submit bids
3. Customer reviews bids and accepts one
4. An Order is created — but with a status of **"waiting manufacturer acceptance"**
5. Manufacturer must then separately accept or reject the order
6. If rejected, the customer must start the entire process again from step 1

**The problem:** This is logically broken. A manufacturer submitting a bid is already making a
formal offer. Requiring them to re-accept their own offer after the customer accepts it adds
pointless friction and creates a loop with no guaranteed resolution.

**The fix:** A bid submission should be treated as a binding commitment. When a customer accepts
a bid, the order should auto-confirm and go directly into production status. The
`production-ack` endpoint should be repurposed from a blocking gate into a non-blocking
production start notification.

---

## Relevant File Structure

```
models/
  Bid.js
  Order.js
  RFQ.js
  Notification.js

app/api/
  rfqs/[id]/accept-bid/route.js        ← PRIMARY CHANGE
  orders/[id]/production-ack/route.js  ← REPURPOSE (non-blocking)
  orders/[id]/route.js
  orders/[id]/status/route.js
  orders/[id]/cancel/route.js
  bids/[id]/route.js
  bids/[id]/withdraw/route.js

app/manufacturer/
  orders/[id]/page.js                  ← UI update
  orders/[id]/milestones/page.js
  bids/[id]/page.js                    ← Show binding commitment notice
  rfqs/[id]/bid/page.js                ← Add binding disclaimer on bid form

app/customer/
  orders/[id]/page.js                  ← UI update
  rfqs/[id]/bids/page.js               ← UI update

services/
  notificationService.js               ← New notification type
  bidService.js                        ← May need updates
```

---

## Implementation Instructions

### 1. Update the Order model (`models/Order.js`)

Find the `status` field enum/definition. Make these changes:

- **Remove** `waiting_manufacturer_acceptance` (or `pending_manufacturer_acceptance` or however
  it is currently named) as the default status when an order is created from a bid acceptance.
- **Ensure** the following statuses exist in the enum (add if missing):
  - `confirmed` — order created and auto-confirmed, manufacturer notified
  - `in_production` — manufacturer has acknowledged and begun work
  - `cancellation_requested` — manufacturer requested cancellation within the window
  - Keep all existing statuses: `shipped`, `delivered`, `completed`, `cancelled`, `disputed`, etc.

- **Add** a new field to the Order schema:
  ```js
  cancellationWindowExpiresAt: {
    type: Date,
    default: null,
  },
  cancellationRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  cancellationReason: {
    type: String,
    default: null,
  },
  productionAcknowledgedAt: {
    type: Date,
    default: null,
  },
  ```

### 2. Update the Bid model (`models/Bid.js`)

Ensure the Bid schema has or add:
```js
isBindingCommitment: {
  type: Boolean,
  default: true,
},
```

This field documents that bid submission constitutes a binding commitment. It can be used for
display purposes and any future policy enforcement.

### 3. Rewrite `app/api/rfqs/[id]/accept-bid/route.js` (PRIMARY CHANGE)

This is the most important file. The current logic likely:
1. Marks the bid as accepted
2. Creates an order with status `waiting_manufacturer_acceptance`
3. Sends a notification to the manufacturer to accept/reject

**Replace that logic with:**

```
POST /api/rfqs/[id]/accept-bid
Body: { bidId: string }
Auth: customer only
```

New logic:
1. Validate the RFQ belongs to the authenticated customer
2. Validate the bid belongs to this RFQ and is in `pending` status
3. Mark the selected bid as `accepted`
4. Mark all other bids on this RFQ as `rejected` (already existing logic, keep it)
5. Mark the RFQ as `closed` or `fulfilled`
6. **Create the Order with:**
   ```js
   status: 'confirmed',  // NOT waiting_manufacturer_acceptance
   cancellationWindowExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h window
   // Copy over bid details: price, delivery timeline, manufacturer ref, etc.
   ```
7. Send notification to the manufacturer:
   - Type: `order_confirmed_from_bid`
   - Message: "Your bid has been accepted. Order #[id] is confirmed. You have 48 hours to
     request cancellation if you cannot fulfil this order, after which you are committed."
8. Send notification to the customer:
   - Type: `order_created`
   - Message: "You accepted [Manufacturer]'s bid. Order #[id] has been created and the
     manufacturer has been notified to begin production."
9. Return the created order

### 4. Repurpose `app/api/orders/[id]/production-ack/route.js` (NON-BLOCKING)

Currently this likely acts as a gate — manufacturer must hit this before the order proceeds.

**Change it to a non-blocking acknowledgment:**

```
POST /api/orders/[id]/production-ack
Auth: manufacturer who owns this order
```

New logic:
1. Validate order belongs to this manufacturer
2. Validate order status is `confirmed` (not already `in_production` or beyond)
3. Update:
   ```js
   status: 'in_production',
   productionAcknowledgedAt: new Date(),
   ```
4. Send notification to customer:
   - Type: `production_started`
   - Message: "Order #[id] — [Manufacturer] has confirmed production has started."
5. Return updated order

**This is now optional/informational** — the order moves forward regardless of whether the
manufacturer calls this endpoint. It is a quality-of-life update for the customer, not a gate.

### 5. Add a new cancellation-within-window endpoint

Create `app/api/orders/[id]/manufacturer-cancel/route.js`:

```
POST /api/orders/[id]/manufacturer-cancel
Auth: manufacturer who owns this order
Body: { reason: string }
```

Logic:
1. Validate order belongs to this manufacturer
2. Validate order status is `confirmed` (not yet `in_production`)
3. Validate `cancellationWindowExpiresAt` has not passed:
   ```js
   if (new Date() > order.cancellationWindowExpiresAt) {
     return 400: "Cancellation window has expired. Contact support to resolve this."
   }
   ```
4. Update order:
   ```js
   status: 'cancellation_requested',
   cancellationReason: reason,
   cancellationRequestedBy: manufacturer._id,
   ```
5. Find all other bids on the original RFQ that were marked `rejected` — retrieve them ordered
   by bid amount (or however bids are ranked).
6. Send notification to the customer:
   - Type: `manufacturer_cancelled`
   - Message: "[Manufacturer] has cancelled order #[id] within the cancellation window.
     Reason: [reason]. There are [N] other bids available on your original RFQ — you can
     accept one without creating a new RFQ."
   - Include: `alternativeBids: [array of bid IDs]` in the notification metadata if your
     notification model supports metadata
7. Do NOT auto-reassign — let the customer choose from the remaining bids.
8. Reopen the RFQ status to `open` so the customer can accept another bid.
9. Record this cancellation against the manufacturer's profile (for rating/trust purposes — even
   if you don't display it yet, store it).

### 6. Update `app/api/orders/[id]/cancel/route.js`

If this route handles manufacturer cancellations currently, redirect that logic to the new
`manufacturer-cancel` route above. Keep this route for customer-initiated cancellations only
(which may have different rules, e.g. only before production starts).

### 7. Update manufacturer UI — `app/manufacturer/rfqs/[id]/bid/page.js`

On the bid submission form, add a clear disclaimer before the submit button:

```
"By submitting this bid, you are making a binding commitment. If this bid is accepted by the
customer, an order will be automatically created and you will be expected to fulfil it. You will
have a 48-hour window after acceptance to cancel in exceptional circumstances."
```

Style this as a highlighted notice (amber/warning tone), not fine print.

### 8. Update manufacturer UI — `app/manufacturer/bids/[id]/page.js`

On the individual bid detail page, show the binding commitment status:

- If bid is `pending`: show "This bid is a binding commitment if accepted."
- If bid is `accepted`: show "This bid was accepted. Order #[orderId] has been created." with
  a link to the order.

### 9. Update manufacturer UI — `app/manufacturer/orders/[id]/page.js`

**Remove** any UI that asks the manufacturer to "Accept" or "Reject" the order — that step no
longer exists.

**Replace with:**

- If order status is `confirmed` and within cancellation window:
  - Show a "Request Cancellation" button (opens a modal with a required reason field)
  - Show countdown: "You have [X hours] remaining in the cancellation window"
  - Show a "Start Production" button that calls the `production-ack` endpoint (optional but
    encouraged — it notifies the customer)

- If order status is `confirmed` and cancellation window has expired:
  - Remove the cancellation option
  - Still show the "Mark Production Started" button

- If order status is `in_production`:
  - Show production started timestamp
  - Show milestones as normal

### 10. Update customer UI — `app/customer/orders/[id]/page.js`

**Remove** any messaging like "Waiting for manufacturer to accept your order."

**Replace with:**

- If status is `confirmed`:
  - Show: "Order confirmed. Waiting for manufacturer to begin production."
  - If within 48h of creation, show: "The manufacturer has until [date/time] to request
    cancellation in exceptional circumstances."

- If status is `cancellation_requested`:
  - Show: "The manufacturer has requested cancellation of this order."
  - Show the reason
  - Show a "View alternative bids" button that links to
    `/customer/rfqs/[originalRfqId]/bids` so they can accept another bid

### 11. Update customer UI — `app/customer/rfqs/[id]/bids/page.js`

When the RFQ is in `open` status again (due to manufacturer cancellation), show a banner:

```
"The manufacturer cancelled the previous order. You can accept another bid below."
```

Show previously-rejected bids again as selectable (they were rejected only because another bid
was chosen, not because of a quality issue).

### 12. Update `services/notificationService.js`

Add the following new notification types if they don't exist:

```js
ORDER_CONFIRMED_FROM_BID   // to manufacturer: order auto-created from their bid
PRODUCTION_STARTED         // to customer: manufacturer acknowledged production start  
MANUFACTURER_CANCELLED     // to customer: manufacturer cancelled within window
CANCELLATION_WINDOW_EXPIRING // optional: remind manufacturer 2h before window closes
```

### 13. Optional — Cron job for cancellation window expiry

If your app has a cron system (check `app/api/cron/`), add a job that:

- Runs every hour
- Finds orders where:
  - `status === 'confirmed'`
  - `cancellationWindowExpiresAt` is within the next 2 hours
- Sends a notification to the manufacturer reminding them the window is closing
- Finds orders where:
  - `status === 'confirmed'`  
  - `cancellationWindowExpiresAt` has passed
- Optionally auto-transitions them to `in_production` if you want the status to move forward
  automatically (recommended — otherwise `confirmed` stays forever if the manufacturer never
  calls `production-ack`)

---

## Status Flow Summary (for reference)

```
OLD FLOW:
bid submitted → customer accepts → Order(waiting_manufacturer_acceptance)
                                          ↓ manufacturer accepts → in_production
                                          ↓ manufacturer rejects → customer starts over

NEW FLOW:
bid submitted (= binding commitment)
       ↓
customer accepts bid
       ↓
Order(confirmed) created immediately + 48h cancellation window starts
       ↓                                    ↓
manufacturer hits production-ack    manufacturer requests cancellation (within 48h)
       ↓ (optional, informational)          ↓
Order(in_production)                RFQ reopened → customer picks alternative bid
       ↓                                    ↓
milestones → shipped → delivered    if no alternatives → customer creates new RFQ
```

---

## Things NOT to change

- The bid submission flow itself (`app/api/bids/route.js`, bid creation) — no changes needed
- The milestones system — it already assumes production is happening
- The payment/escrow flow — it should already trigger on order creation, not on
  manufacturer acceptance, but verify this and do not change payment logic unless broken
- The dispute system — no changes needed
- Admin order management — admin views may need the new statuses added to any status
  filter dropdowns, but the underlying logic is unchanged

---

## Key things to verify after implementation

1. Create an RFQ as a customer → have a manufacturer submit a bid → accept the bid → confirm
   the order is immediately in `confirmed` status, not `waiting_manufacturer_acceptance`
2. Confirm the manufacturer receives a notification without needing to take any action
3. Confirm the manufacturer can request cancellation within 48h
4. Confirm cancellation after 48h is blocked
5. Confirm the customer sees the alternative bids after a cancellation
6. Confirm the manufacturer can optionally hit "start production" and the customer is notified
7. Check that any admin dashboard status filters include the new `confirmed` status
