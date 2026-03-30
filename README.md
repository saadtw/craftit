# CraftIt — B2B Custom Manufacturing Marketplace

CraftIt is a full-stack B2B web platform that connects **buyers** who need custom manufactured parts and products with **manufacturers** who can fulfil those orders. The platform handles the full order lifecycle — from discovery and quotation through production, delivery, payment, and post-order feedback.

> Final Year Project (FYP) — built with Next.js, MongoDB, and Tailwind CSS.

---

## What It Does

### For Buyers (Customers)

- Browse verified manufacturer profiles and product catalogues
- Place direct product orders or submit **custom order requests** with specifications, drawings, and 3D model files
- Issue **Requests for Quotation (RFQs)** and receive competitive bids from multiple manufacturers
- Negotiate pricing and lead times via integrated **chat**, then accept a bid to convert it into an order
- Join **Group Buys** to unlock bulk-pricing tiers alongside other buyers
- Track production milestones and shipment status in real time
- File disputes on orders and leave verified reviews on completion

### For Manufacturers

- Create a business profile and list products with pricing, minimum order quantities, and capabilities
- New accounts start as **Unverified** — submit business documents (NTN/STRN, SECP/Form-C, Chamber Certificate) to get verified
- Verified manufacturers can browse and bid on open RFQs, create Group Buy campaigns, and receive orders
- Manage production milestones, upload progress photos, and add shipment tracking info
- View earnings, analytics, and respond to any disputes raised

### For Admins

- Review manufacturer verification applications with approve / reject / request-more-info actions
- Monitor platform activity: active orders, open disputes, pending verifications
- Manage users (suspend / unsuspend with reason and duration)
- Resolve disputes between buyers and manufacturers
- Full audit log of all admin actions

---

## Tech Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| Framework      | Next.js (App Router), JavaScript            |
| UI             | React, Tailwind CSS v4                      |
| Authentication | NextAuth.js v4 — JWT, Credentials provider  |
| Database       | MongoDB via Mongoose                        |
| File Storage   | AWS S3 — images, documents, 3D models       |
| Payments       | Stripe (test mode) — authorize-then-capture |

---

## Prerequisites

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **npm** v9+ (bundled with Node.js)
- **MongoDB** — [Community Server](https://www.mongodb.com/try/download/community) locally on port `27017`, or a free [Atlas](https://www.mongodb.com/atlas) cluster
- **AWS S3 bucket** for file uploads (images, documents, 3D models)
- **Stripe account** — optional; the app works without it for demo purposes

---

## Installation

```bash
git clone https://github.com/saadtw/craftit.git
cd craftit
npm install
```

---

## Environment Variables

Create a `.env.local` file in the project root. This file is never committed.

```env
# Database
MONGODB_URI=mongodb://localhost:27017/craftit_local

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret-here

# AWS S3 (file uploads)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# Stripe — optional
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Notes:**

- Generate `NEXTAUTH_SECRET` with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- File uploads will fail without AWS vars, but everything else works normally
- Stripe is fully optional — orders and payments work in a demo mode without it

---

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Creating an Admin Account

The platform requires at least one admin user to approve manufacturers. A seed script is included:

```bash
cd scripts/createAdmin
node page.js
```

| Field    | Default value |
| -------- | ------------- |
| Email    | `a@gmail.com` |
| Password | `admin`       |

> Change the password immediately after first login. The script will not create a duplicate if the account already exists.

---

## Seeding Test Data

To quickly populate the database with realistic sample data for development and testing, run the seed script:

```bash
node --env-file=.env.local scripts/seedDatabase.js
```

This script creates:

- **2 Admin accounts** for platform management
- **25 Customer accounts** with saved addresses and preferences
- **15 Manufacturer accounts** (80% verified, 20% unverified) with business profiles
- **75+ Products** across manufacturers with pricing and specifications
- **Custom orders, RFQs, and competitive bids** for testing quotation workflows
- **Group buy campaigns** with tiered bulk-pricing tiers
- **45+ Orders** in various lifecycle states (pending, in-production, shipped, completed)
- **Customer reviews** and dispute records for rating systems
- **Chat conversations and messages** between buyers and manufacturers
- **Notifications and admin activity logs** for audit trails

**Test credentials generated:**

- Admin: `admin1@craftit.com` / `Admin123!`
- Customers: Any generated email / `Customer123!`
- Manufacturers: Any generated email / `Manufacturer123!`

**Notes:**

- The script clears all existing data before seeding
- File upload URLs to AWS S3 are excluded to prevent 403 errors in test mode
- Stripe payment records are not created; use test card `4242 4242 4242 4242` manually
- Only use on local/dev databases; never on production

---

## Payments (Stripe)

CraftIt uses an **authorize-then-capture** payment flow:

1. Buyer enters card details at checkout — funds are **held but not charged**
2. Manufacturer accepts the order — funds are **captured (charge happens here)**
3. If cancelled before acceptance — **authorization is released** (no charge)
4. Dispute resolved in buyer's favour — **refund is issued**

**Test card:** `4242 4242 4242 4242`, any future expiry, any CVC.

For local webhook testing (capture/refund events):

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the printed `whsec_...` key into `STRIPE_WEBHOOK_SECRET`.

---

## File Uploads (AWS S3)

| Type     | Accepted formats                 | Max size |
| -------- | -------------------------------- | -------- |
| Image    | `.jpg`, `.jpeg`, `.png`, `.webp` | 5 MB     |
| 3D Model | `.stl`, `.obj`, `.gltf`, `.glb`  | 50 MB    |
| Document | `.pdf`, `.doc`, `.docx`          | 10 MB    |

Minimum IAM policy for the S3 user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::your-s3-bucket-name/*"
    }
  ]
}
```

---

## Production

```bash
npm run build
npm start
```

For production deployment:

- Set `NEXTAUTH_URL` to your public domain
- Use a MongoDB Atlas connection string
- Configure CORS on your S3 bucket
- Register the Stripe webhook endpoint (`/api/payments/webhook`) in the Stripe dashboard
