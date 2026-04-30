# How to Generate STRIPE_WEBHOOK_SECRET

---

## Development (Local Testing)

1. Install Stripe CLI if you haven't:

   ### Windows (PowerShell)

   choco install stripe-cli

   ### or download from <https://stripe.com/docs/stripe-cli>

2. Authenticate Stripe CLI:

   stripe login

   This opens a browser to authenticate.

3. Start listening for webhooks:

   stripe listen --forward-to localhost:3000/api/payments/webhook

4. Copy the whsec\_... key into your .env.local:

   STRIPE_WEBHOOK_SECRET=whsec_1234...xyz

5. Restart your dev server (the env vars are read at startup)

---

## Production

1. Login to Stripe Dashboard

2. Go to Developers → Webhooks

3. Click "Add an endpoint" and enter:
   Endpoint URL: <https://yourdomain.com/api/payments/webhook>

4. Version: Use your account's API version (or latest)

5. Select events to listen for:
   payment_intent.succeeded
   payment_intent.canceled
   charge.refunded

6. Click "Create endpoint"

7. Reveal the signing secret → Copy it to STRIPE_WEBHOOK_SECRET in your production .env
