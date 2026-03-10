# Craft It — B2B Manufacturing Marketplace

Craft It is a full-stack B2B marketplace that connects **customers** who need manufactured parts or products with **manufacturers** who can fulfil those orders. It supports custom orders, RFQ (Request for Quotation) workflows, competitive bidding, group buys, milestone-based order tracking, and an admin back-office for manufacturer verification.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [User Roles & Features](#user-roles--features)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Running the Project](#running-the-project)
7. [Creating an Admin User](#creating-an-admin-user)
8. [AWS S3 Setup (File Uploads)](#aws-s3-setup-file-uploads)
9. [Project Structure](#project-structure)
10. [Production Build & Deployment](#production-build--deployment)

---

## Tech Stack

| Layer            | Technology                                 |
| ---------------- | ------------------------------------------ |
| Framework        | Next.js 16 (App Router)                    |
| UI               | React 19, Tailwind CSS v4                  |
| Authentication   | NextAuth.js v4 (JWT, Credentials provider) |
| Database         | MongoDB via Mongoose v9                    |
| File Storage     | AWS S3 (v3 SDK)                            |
| Password Hashing | bcryptjs                                   |
| Validation       | Zod                                        |
| Icons            | Google Material Symbols (CDN)              |

---

## User Roles & Features

### Customer

- Register and log in with email/password
- Browse manufacturer products
- Create **custom orders** with specifications and uploaded files (images, 3D models, documents)
- Issue **RFQs** (Requests for Quotation) and receive competitive bids from manufacturers
- Accept/reject bids, place orders, and track milestones
- Leave reviews on completed orders

### Manufacturer

- Register and log in (account starts unverified — requires admin approval)
- Manage a **product catalogue** (create, edit, set status)
- Browse open RFQs and submit **bids** with pricing and lead times
- Manage **orders** with milestone-based progress updates
- Create and manage **group buys** for bulk-order opportunities
- View earnings and performance stats on the dashboard

### Admin

- Log in with admin credentials
- **Verify or reject** manufacturer accounts (with rejection reason)
- Monitor platform stats (pending verifications, active orders, users)

---

## Prerequisites

Make sure the following are installed before continuing:

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **npm** v9+ (bundled with Node.js)
- **MongoDB** — either:
  - [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally on port `27017`, **or**
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- An **AWS account** with an S3 bucket (required for file upload features — see [AWS S3 Setup](#aws-s3-setup-file-uploads))

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/saadtw/craftit.git
cd craftit

# 2. Install dependencies
npm install
```

---

## Environment Variables

Create a file named `.env.local` in the project root. This file is never committed to version control.

```env
# ─── Database ────────────────────────────────────────────────────────────────
# Local MongoDB (default for development)
MONGODB_URI=mongodb://localhost:27017/craftit_local

# OR use a MongoDB Atlas connection string (recommended for production)
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# ─── NextAuth ────────────────────────────────────────────────────────────────
# The publicly accessible URL of the app (no trailing slash)
NEXTAUTH_URL=http://localhost:3000

# A long, random secret used to sign JWT session tokens.
# Generate one with: openssl rand -base64 32
NEXTAUTH_SECRET=your-long-random-secret-here

# ─── AWS S3 (File Uploads) ────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-s3-bucket-name
```

### Variable Reference

| Variable                | Required | Description                                     |
| ----------------------- | -------- | ----------------------------------------------- |
| `MONGODB_URI`           | Yes      | MongoDB connection string                       |
| `NEXTAUTH_URL`          | Yes      | Full URL where the app is hosted                |
| `NEXTAUTH_SECRET`       | Yes      | Secret for signing JWTs — must be kept private  |
| `AWS_ACCESS_KEY_ID`     | Yes\*    | AWS IAM access key                              |
| `AWS_SECRET_ACCESS_KEY` | Yes\*    | AWS IAM secret key                              |
| `AWS_REGION`            | Yes\*    | AWS region of your S3 bucket (e.g. `us-east-1`) |
| `AWS_BUCKET_NAME`       | Yes\*    | Name of the S3 bucket for uploads               |

\*File upload endpoints will fail without these, but the rest of the app will function normally.

> **Tip:** Generate a strong `NEXTAUTH_SECRET` with:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
> ```

---

## Running the Project

### Development (with hot reload)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Linting

```bash
npm run lint
```

---

## Creating an Admin User

The application requires at least one admin account to approve manufacturer registrations. A Node.js script is included to create the default admin user directly in the database.

> **Run this after** starting MongoDB and setting up `.env.local`.

```bash
cd scripts/createAdmin
node page.js
```

This will create an admin user with the following credentials:

| Field    | Value         |
| -------- | ------------- |
| Email    | `a@gmail.com` |
| Password | `admin`       |
| Role     | `admin`       |

**Important:** Change the password after your first login. The script will print a warning if the admin account already exists and will not create a duplicate.

If the script cannot connect to MongoDB, verify that:

1. MongoDB is running (`mongod` process is active for local installs)
2. The `MONGODB_URI` inside `scripts/createAdmin/page.js` matches your local setup (it defaults to `mongodb://localhost:27017/craftit_local`)

---

## AWS S3 Setup (File Uploads)

Craft It uses AWS S3 to store uploaded files. Uploads are organised into sub-folders:

| File Type | Allowed Extensions            | Max Size | S3 Folder    |
| --------- | ----------------------------- | -------- | ------------ |
| Image     | `.jpg` `.jpeg` `.png` `.webp` | 5 MB     | `images/`    |
| 3D Model  | `.stl` `.obj` `.gltf` `.glb`  | 50 MB    | `3d-models/` |
| Document  | `.pdf` `.doc` `.docx`         | 10 MB    | `documents/` |

### Minimum IAM Policy

Attach the following policy to the IAM user whose credentials you put in `.env.local`:

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

Make sure the bucket's **Block Public Access** settings allow public reads if you want uploaded files to be viewable without signed URLs (the app constructs direct `https://<bucket>.s3.<region>.amazonaws.com/<key>` URLs).

---

## Project Structure

```
craftit/
├── app/                        # Next.js App Router pages and API routes
│   ├── layout.js               # Root layout (SessionProvider, fonts, metadata)
│   ├── page.js                 # Landing page (redirects based on role)
│   ├── globals.css             # Global styles
│   │
│   ├── auth/                   # Public auth pages
│   │   ├── login/              # Sign-in form
│   │   └── signup/             # Role selector → customer / manufacturer
│   │
│   ├── customer/               # Customer-only pages (guarded)
│   │   ├── dashboard/
│   │   ├── orders/[id]/
│   │   ├── custom-orders/
│   │   └── rfqs/[id]/bids/
│   │
│   ├── manufacturer/           # Manufacturer-only pages (guarded)
│   │   ├── dashboard/
│   │   ├── products/           # Product CRUD
│   │   ├── orders/[id]/milestones/
│   │   ├── bids/
│   │   ├── rfqs/[id]/bid/
│   │   └── group-buys/
│   │
│   ├── admin/                  # Admin-only pages (guarded)
│   │   ├── dashboard/
│   │   └── manufacturers/      # Verification queue
│   │
│   └── api/                    # REST API (Next.js Route Handlers)
│       ├── auth/               # NextAuth + /me endpoint
│       ├── products/           # Product CRUD, bulk ops, stats
│       ├── rfqs/               # RFQ management + recommended
│       ├── bids/               # Bid CRUD + withdraw + chat
│       ├── orders/             # Order lifecycle + milestones + reviews
│       ├── custom-orders/      # Custom order management
│       ├── group-buys/         # Group buy management + join/status
│       ├── upload/             # Single and multi-file S3 upload
│       └── admin/manufacturers/# Admin verification endpoints
│
├── components/
│   └── LogoutButton.js         # Shared sign-out component
│
├── lib/
│   ├── auth.js                 # NextAuth configuration (authOptions)
│   └── mongodb.js              # Mongoose connection with global cache
│
├── models/                     # Mongoose schemas
│   ├── User.js                 # Customer / Manufacturer / Admin
│   ├── Product.js
│   ├── RFQ.js
│   ├── Bid.js
│   ├── Order.js
│   ├── CustomOrder.js
│   ├── GroupBuy.js
│   ├── Chat.js
│   ├── ChatMessage.js
│   └── VerificationDocument.js
│
├── services/                   # Business logic helpers
│   ├── bidService.js
│   ├── bidComparisonService.js
│   └── matchingService.js
│
├── scripts/
│   └── createAdmin/
│       └── page.js             # One-time admin seeding script
│
├── public/                     # Static assets
├── .env.local                  # Environment variables (create this — not committed)
├── next.config.mjs
├── postcss.config.mjs
├── jsconfig.json               # Path alias @/* → project root
└── package.json
```

## Production Build & Deployment

### Build

```bash
npm run build
```

Next.js will compile and optimise the application. Check the output for any errors before deploying.

### Start (production server)

```bash
npm start
```

### Environment notes for production

- Set `NEXTAUTH_URL` to your actual public domain (e.g. `https://craftit.example.com`).
- Replace the local `MONGODB_URI` with a MongoDB Atlas connection string.
- Ensure your S3 bucket has appropriate CORS and access policies.
- Use a secrets manager or your hosting platform's environment variable system — never commit `.env.local`.
