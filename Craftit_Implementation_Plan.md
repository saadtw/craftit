# Craftit Platform — Comprehensive Implementation Gap Analysis & Fix Plan

> Full codebase audit — All gaps, issues, and phased build roadmap  
> May 2026 | University Project — Stripe Sandbox only

---

## How to Use This Document

This document is the result of a **three-source audit**:
1. Issues and requirements raised in the planning conversation
2. The roadmap Cursor AI generated
3. A direct line-by-line inspection of every relevant file in the craftit Next.js codebase

Where Cursor's plan was inaccurate, incomplete, or missed something, this document corrects it.

Work phases **in order (P0 → P7)**. Each item lists: the gap or wrong behavior observed in the actual code, the exact file(s) involved, the target behavior you described, and enough implementation detail to hand this to another developer or AI without losing context.

---

## Part 0 — Intentional Design (No Code Required)

| Item | Policy |
|------|--------|
| **Admin accounts** | Created only via DB management (e.g. `scripts/seedDatabase.js`). No public admin registration API. No change needed. |
| **Google OAuth scope** | Customers only. Manufacturers never use Google. `lib/auth.js` already creates new OAuth users as `role: "customer"`. Keep as-is — but ensure manufacturer signup UI never shows a Google button. |

---

## Phase 0 — Authentication & Identity `[P0 — Do First]`

> **These must be done first because all other phases depend on login working correctly.**

---

### 0-A  OTP Email Verification (Manual Signup — Customer & Manufacturer)

#### Current State (Confirmed in Code)
`app/api/auth/register/customer/route.js` and `register/manufacturer/route.js` both:
- Generate a random 32-byte token, hash it, store `emailVerificationToken` + `emailVerificationExpires` on the User
- Call `sendVerificationEmail()` — which sends a **clickable link**

`app/api/auth/verify-email/route.js` accepts a `token` query param and clears the token fields.

`lib/auth.js` `authorize()` allows login while `isEmailVerified` is false — it sets `emailVerificationRequired: true` on the session but **does not block the user**.

#### Required Change — Replace Link with OTP

- Add two fields to `User` model: `emailOtp` (String, `select: false`) and `emailOtpExpires` (Date). Keep `emailVerificationToken` for backward compat during migration.
- On registration, generate a **6-digit numeric OTP** using `createNumericCode(6)` (already in `lib/token.js`). Store `hashToken(otp)` in `emailOtp` and a **15-minute expiry** in `emailOtpExpires`. Send via a new `sendOtpEmail()` function in `lib/email.js`.
- Create `POST /api/auth/verify-email-otp` — accepts `{ email, otp }`. Hashes otp, finds user by email + matching hash + unexpired. Sets `isEmailVerified = true`, clears otp fields.
- **Block login**: in `lib/auth.js` `authorize()`, if `!user.isEmailVerified` throw `new Error('EMAIL_NOT_VERIFIED')`. The login page already handles this error code — redirect to the OTP entry page.
- **Mobile parity**: `app/api/mobile/auth/login/route.js` already requires `isEmailVerified`. No change needed there.
- **Resend OTP**: update `app/api/auth/resend-verification/route.js` to generate a new OTP. Rate-limit: 1 resend per 60 seconds using a `resendAt` timestamp on User.
- **UI**: add `app/auth/verify-otp/page.js` — shows after registration. Paste-friendly 6-digit input, countdown timer, Resend button.

> **OTP TTL = 15 minutes. Resend cooldown = 60 seconds. After 5 failed attempts, lock verification for 1 hour.** Add `otpFailCount` and `otpLockUntil` to User model.

---

### 0-B  Google Customers: Mandatory Password Setup After First Login

#### Current State (Confirmed in Code)
`lib/auth.js` `signIn` callback creates new Google users with `password: createRawToken(32)` — a random string the user never knows. There is **no flag** to detect "first OAuth login, password not yet set by user". The credentials `authorize()` correctly blocks login if no password exists (throws `OAUTH_ACCOUNT_ONLY`). There is **no password-setup flow**.

#### Required Work

- Add `requiresPasswordSetup: Boolean` (default: `false`) to `User` model.
- In `lib/auth.js` `signIn` callback, when creating a new OAuth user set `requiresPasswordSetup: true`. Add this field to the JWT/session in the `jwt` and `session` callbacks (alongside `isEmailVerified`).
- Create `POST /api/auth/oauth/set-password` — session required, role customer, body: `{ password }`. Validates strength (min 8 chars). Hashes with bcrypt. Sets `password = hash`, `requiresPasswordSetup = false`, increments `sessionVersion`.
- **Middleware or layout gate**: in `app/customer/layout.js`, check `session.user.requiresPasswordSetup`. If true, redirect to `/auth/set-password` regardless of target route.
- **UI**: `app/auth/set-password/page.js` — simple form. Success redirects to `/customer/dashboard`.

---

### 0-C  Manufacturer Google Button Must Not Appear

Confirm that `app/auth/signup/manufacturer/page.js` does not render a Google OAuth button. Manufacturer signup is credentials only.

---

## Phase 1 — Notifications: Missing Wiring & Gaps `[P1]`

---

### 1-A  notify.newMessage Never Called

#### Current State (Confirmed by Code Search)
`services/notificationService.js` has `notify.newMessage()` defined. Searching all files in `app/api/chat/` and `app/api/bids/[id]/chat/route.js`: **zero calls** to `notify.newMessage` anywhere in the codebase. Customers and manufacturers never receive a notification when a new chat message arrives.

#### Required Work

- In `app/api/chat/[orderId]/route.js` (POST handler), after creating the `ChatMessage` and updating the `Conversation`, call:
  ```js
  await notify.newMessage(otherParticipantId, orderId, session.user.name, 'order', isOtherCustomer);
  ```
- In `app/api/bids/[id]/chat/route.js` (POST handler), after saving the message, call:
  ```js
  await notify.newMessage(otherParticipant, bidId, session.user.name, 'bid', isOtherCustomer);
  ```
- **Fix the link** in `notify.newMessage` for bid context: instead of the vague rfqs list, pass `rfqId` and `bidId` to build the link as `/customer/rfqs/[rfqId]/bids` or `/manufacturer/bids/[bidId]`. Extend the function signature to accept an extra `contextId`.

---

### 1-B  order_in_production Notification Not Fired

#### Current State (Confirmed in Code)
In `app/api/orders/[id]/status/route.js`, the `in_production` branch (~line 130) sets `order.status` and saves — **no notify call**. The schema has `order_in_production` type. `orderShipped` and `orderAccepted` are called correctly in their branches.

#### Required Work

- After `order.save()` in the `in_production` branch, add:
  ```js
  await notify.orderInProduction(order.customerId, order._id, order.orderNumber);
  ```
- Add `orderInProduction` helper to `services/notificationService.js`:
  - type: `order_in_production`
  - title: `"Order in production"`
  - message: `"Your order #X is now in production."`
  - link: `/customer/orders/[id]`

---

### 1-C  RFQ Events Not Notified

#### Current State (Confirmed in Code)
`app/api/rfqs/route.js` (POST) creates an RFQ and sets `targetManufacturers`. **No notify call** exists in this file. Schema has `rfq_created`, `rfq_closed`, `rfq_expired` types — none are fired at runtime.

#### Required Work

- **On RFQ creation**: notify each `targetManufacturer` (or all verified manufacturers if `broadcastToAll`) with `type: 'rfq_created'`, title `"New RFQ available"`, link `/manufacturer/rfqs/[id]`.
- **On RFQ close** (accept-bid route sets `rfq.status = 'bid_accepted'`): notify remaining non-accepted bidding manufacturers with `type: 'rfq_closed'`.
- **On RFQ expiry**: when `GET /api/rfqs` auto-marks expired RFQs, fire `rfq_expired` to the RFQ owner (customer).
- Add `notify.rfqCreated`, `notify.rfqClosed`, `notify.rfqExpired` helpers to `notificationService.js`.

---

### 1-D  Group Buy Events Not Notified

#### Current State (Confirmed in Code)
- `app/api/group-buys/[id]/join/route.js` adds participant but calls **no notify**.
- `app/api/group-buys/[id]/status/route.js` completes/cancels campaign but calls **no notify**.
- `notify.groupBuyCompleted` and `notify.groupBuyCancelled` helpers **exist** in `notificationService.js` but have **zero callers** (confirmed by direct search — Cursor only said "verify callers").

#### Required Work

- After successful join: notify manufacturer with `group_buy_joined`, title `"New participant joined"`, link `/manufacturer/group-buys/[id]`.
- After tier unlocked: if `currentTierIndex` changes after `recalculate()`, notify manufacturer with `group_buy_tier_reached`.
- After `end_early` (completed): loop `groupBuy.participants` and call `notify.groupBuyCompleted` for each.
- After cancel: loop participants and call `notify.groupBuyCancelled` for each.

---

### 1-E  Product Q&A — Customer Reply After Answer

#### Current State (Confirmed in Code)
`models/ProductQuestion.js` has a single `question` (String) and a single `answer` object `{text, answeredBy, answeredAt}`. **No `replies[]` array**. `app/api/products/[id]/qa/[questionId]/route.js` (PATCH) sets `answer.text` and changes `status` to `answered`. There is no way for a customer to follow up.

#### Required Work

- Add `replies` array to `ProductQuestion` schema:
  ```js
  replies: [{
    authorId: { type: ObjectId, ref: 'User' },
    authorRole: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
  ```
- Create `POST /api/products/[id]/qa/[questionId]/reply` — accepts `{ text }` from customer or manufacturer. Validates Q belongs to product, status is `answered`, author is involved party. Pushes to `replies[]`.
- Notify the other party on reply. Add `question_customer_reply` to `Notification` schema enum. Add `notify.questionCustomerReply` helper.
- Update product Q&A UI to render replies thread under each answered question.

---

### 1-F  Support Ticket Notifications (Lower Priority)

`Notification` schema has `support_ticket_created` and `support_ticket_replied` types. Verify `app/api/support-tickets/` routes call notify — if not, add them.

---

## Phase 2 — Unified Messages Inbox `[P2]`

---

### 2-A  Bid Chats Missing from Inbox

#### Current State (Confirmed in Code)
`app/api/chat/inbox/route.js` ~line 60:
```js
const baseQuery = {
  participants: session.user.id,
  contextType: "order",   // <-- hardcoded
  isActive: true,
};
```
`models/Chat.js` has `contextType` enum including `"bid"`. `app/api/bids/[id]/chat/route.js` correctly creates Conversations with `contextType: "bid"`. These conversations are **completely invisible** in `app/customer/messages/page.js` and `app/manufacturer/messages/page.js`.

#### Required Work

- Change inbox query:
  ```js
  contextType: { $in: ["order", "bid"] }
  ```
- When `contextType === "bid"`, populate `contextId` against the `Bid` model (not `Order`). Fetch `bid.rfqId`, `bid.manufacturerId`, `bid.rfqId.customerId` to build the thread row.
- Return unified thread shape: add `contextType`, `bidId`, `rfqId` fields alongside existing `orderId` fields. Use `null` for fields that don't apply.
- **UI**: Add filter tabs (All | Orders | Bids). For bid threads, show RFQ title and counterpart. Deep links:
  - Customer → `/customer/rfqs/[rfqId]/bids`
  - Manufacturer → `/manufacturer/bids/[bidId]`
- Disputes remain **excluded** from this inbox by design.

---

## Phase 3 — Dispute Management — Full Feature `[P3]`

---

### 3-A  Dispute Chat / Messaging Thread

#### Current State (Confirmed in Code)
No dispute messaging API exists. `app/api/disputes/[id]/route.js` has `GET` and `PATCH` only. Admin (`app/admin/disputes/[id]/page.js`) and manufacturer (`app/manufacturer/disputes/[id]/page.js`) pages have response/resolution forms but **no chat thread**. `Dispute` model has no `messages` field.

#### Required Work

- **Recommended approach**: Reuse `Conversation` + `ChatMessage` models with `contextType: "dispute"`. Add `"dispute"` to the `contextType` enum in `models/Chat.js`.
- Create `GET /api/disputes/[id]/messages` and `POST /api/disputes/[id]/messages` with role guards (only `customerId`, `manufacturerId`, and admin can access). This route must **not** appear in the unified inbox.
- **UI**: Embed `components/chat/ChatBox.js` on admin, manufacturer, and customer dispute detail pages. Show a timeline of dispute status changes alongside the chat.
- Show unread message count on dispute list pages for each role.
- Messages allowed until status is `"resolved"` or `"closed"`.

---

### 3-B  Manufacturer-Initiated Dispute

#### Current State (Confirmed in Code)
`app/api/disputes/route.js` (POST):
```js
if (!session || session.user.role !== "customer") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
Manufacturers cannot open disputes. This conflicts with the requirement that manufacturers can dispute when a customer refuses a valid payment release request.

#### Required Work

- Extend `POST /api/disputes` to allow manufacturers. Manufacturer disputes link to an order they own (`order.manufacturerId === session.user.id`).
- Add new `issueType` values for manufacturer context: `payment_release_rejected`, `customer_unresponsive`, etc.
- **Manufacturer dispute eligibility**: order must be in `["in_production", "shipped", "completed"]` AND there must be a rejected or expired `PaymentReleaseRequest` on the order (Phase 4 model).
- On creation, set `order.status = "disputed"`. Notify customer and admin.
- Add UI entry point in manufacturer order detail page: "Open Dispute" button visible when a release request has been rejected.

---

### 3-C  under_review Status Never Set

#### Current State (Confirmed in Code)
`models/Dispute.js` has `"under_review"` in the status enum. **No API action ever sets this status** — disputes jump from `manufacturer_responded` directly to `resolved`. The manufacturer UI styles it in `STATUS_COLORS` but the state is unreachable at runtime.

#### Required Work

- In `PATCH /api/disputes/[id]`: add `action: "admin_review"` — admin sets `status` to `"under_review"`. Signals to both parties that the admin is actively reviewing.
- Notify both parties when status moves to `under_review`.

---

### 3-D  Admin Resolution — No Stripe Action

#### Current State (Confirmed in Code)
`PATCH /api/disputes/[id]` `admin_resolve` action:
```js
if (resolution === "refund_customer") {
  order.status = "cancelled";
  order.paymentStatus = "refunded";   // DB only — no Stripe call
  if (resolutionAmount) order.refundAmount = resolutionAmount;
}
```
**No `stripe.refunds.create()` is called.** The refund only exists in the database — no money actually moves.

#### Required Work

- After admin sets `resolution = "refund_customer"`: call
  ```js
  await stripe.refunds.create({
    payment_intent: order.paymentIntentId,
    amount: resolutionAmount * 100
  });
  ```
- After admin sets `resolution = "side_with_manufacturer"`: call `stripe.transfers.create` to release held funds to manufacturer's `stripeConnectAccountId` (Phase 4 connects this).
- Wrap in try/catch — if Stripe call fails, roll back DB change and return 500 with a clear message.

---

## Phase 4 — Mandatory Payments & Platform Escrow `[P4]`

> **All payment work targets Stripe sandbox only. No real charges. Use Stripe test keys and Stripe CLI for webhooks.**

---

### 4-A  Payments Optional Today — Must Be Mandatory When Stripe Is Configured

#### Current State (Confirmed in Code)
- `app/api/orders/product/route.js` accepts optional `paymentIntentId`. If absent, `paymentStatus = "pending"` and order still creates.
- `app/api/rfqs/[id]/accept-bid/route.js` same.
- There is **no enforcement** that payment must happen before order creation when `STRIPE_SECRET_KEY` is present.

#### Required Work

- Create a helper: `isStripeEnabled()` → Boolean (checks `process.env.STRIPE_SECRET_KEY`).
- In `POST /api/orders/product`: if `isStripeEnabled()` and no valid `paymentIntentId` provided → return `400 "Payment is required"`. Verify the PI exists and `status === "requires_capture"` (manual capture mode).
- In `POST /api/rfqs/[id]/accept-bid`: same check.
- In `POST /api/group-buys/[id]/join`: same check (see Phase 5 for the full group-buy payment flow).
- When `STRIPE_SECRET_KEY` is absent, keep the existing optional flow so the app still works without Stripe configured.

---

### 4-B  New Model: PaymentReleaseRequest

Create a new Mongoose model at `models/PaymentReleaseRequest.js`:

| Field | Type | Notes |
|-------|------|-------|
| `orderId` | ObjectId ref Order | Required |
| `manufacturerId` | ObjectId ref User | The one requesting release |
| `customerId` | ObjectId ref User | Must approve |
| `amount` | Number | USD, must be <= remaining held amount |
| `reason` | String | Milestone name or description from manufacturer |
| `proofUrls` | [String] | Upload URLs for milestone evidence |
| `status` | Enum String | `pending \| approved \| rejected \| auto_approved \| cancelled` |
| `requestedAt` | Date | Auto set on create |
| `expiresAt` | Date | `requestedAt + 72 hours` |
| `resolvedAt` | Date | When approved/rejected/auto_approved |
| `transferId` | String | Stripe transfer ID after release |
| `scheduleRef` | ObjectId ref PaymentSchedule | Optional — links to negotiated schedule |

---

### 4-C  Payment Release Flow

#### Manufacturer Requests Release
- Create `POST /api/orders/[id]/payment-release` — manufacturer only.
- Body: `{ amount, reason, proofUrls }`.
- Validates: order belongs to manufacturer, `order.paymentStatus === "captured"`, amount <= (totalPrice - alreadyReleased).
- Creates `PaymentReleaseRequest` with `status: "pending"`, `expiresAt = now + 72h`.
- Notify customer with link to approve.

#### Customer Approves Release
- Create `PATCH /api/orders/[id]/payment-release/[releaseId]` with `action: "approve"`. Customer only.
- Calls:
  ```js
  await stripe.transfers.create({
    amount: release.amount * 100,
    currency: "usd",
    destination: manufacturer.stripeConnectAccountId
  });
  ```
- Sets `release.status = "approved"`, `release.transferId`. Notify manufacturer.

#### Customer Rejects Release
- Same PATCH with `action: "reject"`. Sets `status: "rejected"`. Notify manufacturer.
- Manufacturer can then open a dispute (Phase 3-B).

#### Auto-Approval After 72 Hours
- Create `GET /api/cron/auto-approve-releases` — called by a Vercel cron job or external scheduler every hour.
- Finds `PaymentReleaseRequest` where `status === "pending"` AND `expiresAt <= now`.
- For each: runs the same Stripe transfer logic as approve, sets `status: "auto_approved"`. Notifies both parties.

> **72 hours is the industry standard for B2B payment approval windows.** Adjust via `PAYMENT_RELEASE_TIMEOUT_HOURS` env variable if needed.

---

### 4-D  Optional Payment Schedule (Negotiated Milestones)

Create `models/PaymentSchedule.js` with:
```js
instalments: [{
  name: String,
  percent: Number,
  releaseCondition: String,
  releasedAt: Date
}]
```

- Create `GET/POST /api/orders/[id]/payment-schedule`. Both parties must confirm the schedule before production starts.
- Each instalment maps to a `PaymentReleaseRequest` when the manufacturer marks that phase done.
- **This is optional** — if no schedule, 100% is released after shipment confirmed by customer or auto-approved 72h after manufacturer marks shipped.

---

### 4-E  Full vs Partial Release Options (UI)

The order detail page for both customer and manufacturer should show:

- **Release on shipment**: manufacturer marks shipped → customer confirms receipt → payment auto-releases 72h after or customer clicks "Confirm Receipt & Release Payment".
- **Milestone releases**: each instalment request appears as a card — customer sees reason, amount, proof files. Options: Approve / Request More Proof / Reject.

---

### 4-F  Stripe Connect — Manufacturer Payout

#### Current State (Confirmed in Code)
`User` model has `stripeConnectAccountId: String`. `app/api/users/[id]/payouts/connect/route.js` creates a Stripe Connect onboarding link. **`stripe.transfers.create` is never called anywhere in the codebase** — funds are held in the platform account indefinitely after capture.

#### Required Work

- Ensure manufacturer settings page shows Stripe Connect onboarding button and status (already partially implemented — verify it works).
- All release-related Stripe calls (Phase 4-C) must use `stripe.transfers.create({ destination: manufacturer.stripeConnectAccountId })`.
- If manufacturer has no Connect account, **block** the release request creation with a clear error: "You must complete Stripe onboarding before requesting payment release."
- For Stripe sandbox: use test Connect accounts. Stripe test mode fully supports this.

---

## Phase 5 — Group Buy: Full End-to-End Flow `[P5]`

---

### 5-A  Real Payment on Join

#### Current State (Confirmed in Code)
`app/api/group-buys/[id]/join/route.js`:
```js
groupBuy.participants.push({
  ...
  paymentStatus: "authorized", // real payment auth would happen here
});
```
No Stripe `PaymentIntent` is created or verified. `ParticipantSchema.paymentIntentId` field is unused.

#### Required Work

- **Frontend**: before calling `POST /api/group-buys/[id]/join`, customer creates a Stripe `PaymentIntent` via `POST /api/payments/create-intent` with the calculated `totalPrice`. Stripe Elements confirms the payment (manual capture mode).
- Join body now includes `paymentIntentId`. API verifies the PI exists and is in `requires_capture` state. Stores `paymentIntentId` on the participant.
- On successful join, capture a percentage of the PI based on `groupBuy.joinHoldPercent` (new field — see 5-B).

---

### 5-B  Manufacturer-Configurable Hold Percentage

#### Current State
`GroupBuy` model has no field for how much of the total committed amount to hold upfront at join.

#### Required Work

- Add `joinHoldPercent: { type: Number, min: 0, max: 100, default: 100 }` to `GroupBuySchema`. Manufacturer sets this when creating the campaign.
- If `joinHoldPercent < 100`: capture only `joinHoldPercent`% of the PI at join time. Store `heldAmount` on the participant. The remaining becomes `remainingBalance` due when group-buy converts to order.
- Add `heldAmount` and `remainingBalance` to `ParticipantSchema`.

---

### 5-C  Group Buy Completion Creates Orders (Critical Gap)

#### Current State (Confirmed in Code)
`app/api/group-buys/[id]/status/route.js`, `end_early` case:
```js
case "end_early":
  groupBuy.status = "completed";
  groupBuy.completedAt = new Date();
  groupBuy.endDate = new Date();
  // NOTE: Order creation for participants would be triggered here
  break;
```
**No `Order.create` call exists.** Same gap in the auto-complete path in `group-buys/route.js`. `Order.orderType === "group_buy"` only exists in seed data.

#### Required Work

In `end_early` and the auto-complete path, after saving the completed `groupBuy`, loop over `groupBuy.participants` and for each create:
```js
await Order.create({
  orderType: "group_buy",
  groupBuyId: groupBuy._id,
  productId: groupBuy.productId,
  customerId: participant.customerId,
  manufacturerId: groupBuy.manufacturerId,
  quantity: participant.quantity,
  unitPrice: participant.unitPrice,
  totalPrice: participant.totalPrice,
  status: "pending_acceptance",
  paymentStatus: participant.remainingBalance > 0 ? "authorized" : "captured",
});
```
- Set `participant.orderId = order._id`. Save `groupBuy`.
- Notify each participant via `notify.groupBuyCompleted()`.

---

### 5-D  Post-Completion: Customer Pays Remaining Balance + Production Ack

#### Target Flow

1. Order created from group-buy lands in `pending_acceptance`.
2. Customer visits the order and sees: "Pay remaining balance ($X) to start production" button. If `joinHoldPercent === 100`, no remaining balance — skip to step 3.
3. Customer pays remaining via another `PaymentIntent`.
4. Customer clicks **"Agree to Start Production"**. Order status moves to `accepted`. Manufacturer is notified.

#### Required Work

- Add `awaiting_production_ack` to `Order` status enum in `models/Order.js` (between `pending_acceptance` and `accepted`).
- Create `POST /api/orders/[id]/production-ack` — customer only. Checks:
  - Order is `orderType: "group_buy"`
  - `paymentStatus` satisfies requirements (remaining balance paid)
  - Sets `status: "accepted"`. Notifies manufacturer.

---

### 5-E  Customer Leave / Campaign Cancel — Refund from Held Funds

#### Current State (Confirmed in Code)
`DELETE /api/group-buys/[id]/join`:
```js
// TODO (Phase 8/Payments): trigger refund for participant's paymentIntentId here
```
No Stripe cancel/refund is ever issued.

#### Required Work

- **On participant leave** (campaign still active): refund `heldAmount` by calling `stripe.refunds.create({ payment_intent: participant.paymentIntentId })` or `stripe.paymentIntents.cancel()` if not yet captured.
- **On manufacturer campaign cancel**: loop all participants and refund each. Call `notify.groupBuyCancelled` for each.
- **On post-completion order cancel**: refund `heldAmount` only (forfeit to manufacturer per policy). `heldAmount` transfer goes to manufacturer's Connect account. Remaining unpaid balance is simply cancelled.

---

## Phase 6 — Commerce Logic Gaps `[P6]`

---

### 6-A  Customer Cannot Advance Order Milestone

#### Current State (Confirmed in Code)
`app/api/orders/[id]/milestones/route.js` POST and PUT are **manufacturer-only**. Customers can only GET milestones.

#### Required Work

- Allow customers to **confirm** milestones — add `customerConfirmedAt: Date` to each milestone sub-document.
- Add `customerActions` enum to milestones: `["awaiting_confirmation", "confirmed", "disputed"]`. Manufacturer marks complete → customer confirms.
- For group-buy orders, the `production-ack` (Phase 5-D) acts as the customer's first milestone confirmation.

---

### 6-B  Order Ship Route — Notification Check

`app/api/orders/[id]/ship/route.js` — verify `notify.orderShipped` is called here. If both this route and the status route can mark as shipped, ensure both fire the notification. Consolidate if possible to avoid duplicate notifications.

---

## Phase 7 — Webhooks, Edge Cases & Hardening `[P7]`

---

### 7-A  Webhook Events Are Insufficient

#### Current State (Confirmed in Code)
`app/api/payments/webhook/route.js` handles: `payment_intent.succeeded`, `payment_intent.canceled`, `charge.refunded`.

**Missing handlers:**
- `transfer.created` / `transfer.failed` — critical for knowing if manufacturer payouts succeeded
- `account.updated` — for Connect account status changes (manufacturers completing onboarding)
- `payment_intent.requires_action` — if 3D Secure kicks in, frontend must be informed

#### Required Work

```js
case "transfer.created":
  // Find PaymentReleaseRequest by transferId metadata, set status confirmed, notify manufacturer
  break;

case "transfer.failed":
  // Set release status to failed, notify manufacturer and admin
  break;

case "account.updated":
  // Update manufacturer stripeConnectAccountId and onboarding status
  break;
```

---

### 7-B  Capture Route Duplication (Double-Capture Risk)

`app/api/payments/capture/route.js` and the `accepted` branch in `app/api/orders/[id]/status/route.js` **both** call `stripe.paymentIntents.capture()`. This means capture can be triggered twice.

**Required Work**: Extract capture logic into a shared utility function. The status route should use this utility. The standalone `/api/payments/capture` route can be deprecated or restricted to internal/admin use only.

---

### 7-C  Dispute Resolution — Stripe Not Called (See Phase 3-D)

After `admin_resolve`, the webhook `charge.refunded` should confirm the refund. Currently there is no way to verify the Stripe refund actually happened. Ensure the `admin_resolve` handler initiates the Stripe call (Phase 3-D) and the webhook confirms it.

---

## Master Gap Summary Table

| Phase | Item | Source | Severity | Summary |
|-------|------|--------|----------|---------|
| P0-A | OTP email verify | Your requirement | 🔴 CRITICAL | Link-based today; must replace with 6-digit OTP. Login must block unverified users. |
| P0-B | Google → set password | Your requirement | 🔴 CRITICAL | No password-setup gate after first OAuth login. `requiresPasswordSetup` field missing. |
| P0-C | Manufacturer no Google | Your requirement | 🟡 LOW | Confirm no Google button on manufacturer signup page. |
| P1-A | newMessage never called | Code audit | 🔴 HIGH | `notify.newMessage` exists but zero callers. No chat notifications for either role. |
| P1-B | in_production no notify | Code audit + Cursor | 🟠 MEDIUM | `order_in_production` enum exists, notify helper missing, not called. |
| P1-C | RFQ notifications missing | Code audit + Cursor | 🟠 MEDIUM | `rfq_created/closed/expired` schema types exist, never fired at runtime. |
| P1-D | Group buy notify missing | Code audit + Cursor | 🟠 MEDIUM | `groupBuyCompleted/Cancelled` helpers exist but have **zero callers** (confirmed by search). |
| P1-E | Q&A: customer reply | Your requirement + Cursor | 🟠 MEDIUM | `ProductQuestion` is single Q+A only. No `replies[]` field or thread. |
| P2-A | Bid chats not in inbox | Code audit + Cursor | 🔴 HIGH | Inbox hardcodes `contextType: "order"`. Bid conversations completely invisible. |
| P3-A | No dispute chat thread | Your requirement + Cursor | 🔴 HIGH | No messages API or UI chatbox for disputes. All three roles affected. |
| P3-B | Manufacturer can't dispute | Your requirement + Cursor | 🔴 HIGH | `POST /api/disputes` blocks all non-customers. No manufacturer dispute path. |
| P3-C | under_review unreachable | Code audit | 🟡 LOW | Status in enum + styled in UI but no API action ever sets it. |
| P3-D | Admin resolve no Stripe | Code audit | 🔴 HIGH | Admin resolution updates DB only. No `stripe.refunds.create` or transfer called. |
| P4-A | Payment not mandatory | Your requirement + Code | 🔴 CRITICAL | Orders created without `paymentIntentId` when Stripe configured. No enforcement. |
| P4-B | PaymentReleaseRequest missing | Your requirement | 🔴 CRITICAL | No model, no API, no UI for manufacturer to request fund release. |
| P4-C | Release flow missing | Your requirement | 🔴 CRITICAL | No approve/reject/auto-approve logic. No 72h SLA. |
| P4-F | Connect transfer never called | Code audit | 🔴 HIGH | `stripeConnectAccountId` exists on User. `stripe.transfers.create` called nowhere. |
| P5-A | Group buy join no payment | Code audit + Cursor | 🔴 CRITICAL | Join sets `paymentStatus: "authorized"` as placeholder comment. No real Stripe PI. |
| P5-C | Completion creates no orders | Code audit + Cursor | 🔴 CRITICAL | `end_early` handler has only a comment. `Order.create` never called for participants. |
| P5-D | No production ack state | Your requirement | 🔴 HIGH | No `awaiting_production_ack` status. Customer cannot signal start after paying. |
| P5-E | Leave/cancel no refund | Code audit + Cursor | 🔴 HIGH | TODO comment in leave handler. No Stripe cancel/refund issued. |
| P7-A | Webhook events limited | Code audit | 🟠 MEDIUM | Missing: `transfer.created/failed`, `account.updated`, `payment_intent.requires_action`. |
| P7-B | Capture route duplication | Code audit | 🟡 LOW | Capture called in two places. Risk of double-capture on order accept. |

---

## Cursor AI Plan — Accuracy Review

### What Cursor Got Correct
- Group buy completion creates no orders — correctly identified with accurate file evidence
- Bid chats not in inbox — correctly identified; `contextType` hardcoded confirmed
- `notify.newMessage` never called — correctly identified
- Manufacturer cannot open a dispute — correctly identified
- Google new users = customer only — correctly identified
- Payment optional when Stripe configured — correctly identified
- Q&A single Q+A model, no follow-up — correctly identified
- `stripeConnectAccountId` exists but transfers not called — correctly identified

### What Cursor Missed or Under-Specified
- **Did not confirm** that `notify.groupBuyCompleted` and `notify.groupBuyCancelled` helpers exist with no callers — it said "verify callers". Zero callers confirmed by direct grep.
- **Did not specify** the 72-hour SLA, the auto-approval cron route, or the specific Stripe transfer flow for the payment release system.
- **Did not identify** that `admin_resolve` updates only the DB — no Stripe refund is triggered. Significant money gap.
- **Did not flag** the double-capture risk from two code paths calling `stripe.paymentIntents.capture()`.
- **Conflated** `PaymentReleaseRequest` and `PaymentSchedule` into a vague single concept — they need to be separate models.
- **Did not note** that `under_review` has no reachable code path (styled in UI, in enum, but no API sets it).
- **Did not audit** the order ship route for a potential missing notification.

### What Cursor Got Wrong
- Cursor said "verify `group_buy_completed` / `group_buy_cancelled` callers" implying they *might* exist. They do not — confirmed by search.
- Cursor's phase ordering was suboptimal. This document refines it: P0 auth → P1 notifications → P2 inbox → P3 disputes UI → P4 payments → P5 group-buy → P6 commerce → P7 webhooks.

---

## Appendix — File Index for Implementation

| Area | Files |
|------|-------|
| **Auth** | `lib/auth.js` · `app/api/auth/register/customer/route.js` · `register/manufacturer/route.js` · `verify-email/route.js` · `resend-verification/route.js` |
| **User Model** | `models/User.js` — add `requiresPasswordSetup`, `emailOtp`, `emailOtpExpires`, `otpFailCount`, `otpLockUntil` |
| **Email** | `lib/email.js` — add `sendOtpEmail()`, update `sendVerificationEmail()` to use OTP |
| **Notifications** | `services/notificationService.js` · `models/Notification.js` — add missing helpers and enum values |
| **Chat Inbox** | `app/api/chat/inbox/route.js` · `models/Chat.js` — extend contextType enum; fix inbox query |
| **Disputes** | `app/api/disputes/route.js` · `app/api/disputes/[id]/route.js` · `models/Dispute.js` · `app/admin/disputes/[id]/page.js` · `app/manufacturer/disputes/[id]/page.js` · `app/customer/orders/[id]/dispute/page.js` |
| **Payments (new)** | `models/PaymentReleaseRequest.js` (NEW) · `models/PaymentSchedule.js` (NEW) · `app/api/orders/[id]/payment-release/route.js` (NEW) · `app/api/cron/auto-approve-releases/route.js` (NEW) |
| **Payments (existing)** | `app/api/payments/create-intent/route.js` · `capture/route.js` · `refund/route.js` · `webhook/route.js` · `app/api/orders/product/route.js` · `app/api/rfqs/[id]/accept-bid/route.js` |
| **Group Buy** | `app/api/group-buys/[id]/join/route.js` · `[id]/status/route.js` · `route.js` · `models/GroupBuy.js` — add `joinHoldPercent`, `heldAmount`, `remainingBalance` |
| **Orders** | `app/api/orders/[id]/status/route.js` · `orders/product/route.js` · `models/Order.js` — add `awaiting_production_ack` status |
| **Milestones** | `app/api/orders/[id]/milestones/route.js` — extend for customer confirmation actions |
| **Product Q&A** | `models/ProductQuestion.js` · `app/api/products/[id]/qa/[questionId]/route.js` — add `replies[]` and `POST /reply` sub-route |
| **Connect** | `app/api/users/[id]/payouts/connect/route.js` · manufacturer settings page |
| **New UI routes** | `app/auth/verify-otp/page.js` · `app/auth/set-password/page.js` · `app/customer/orders/[id]/payment-release/page.js` · `app/manufacturer/orders/[id]/payment-release/page.js` |

---

*Generated from a full, direct inspection of the actual craftit codebase. All file paths and code behaviors cited are verified against the uploaded project files.*
