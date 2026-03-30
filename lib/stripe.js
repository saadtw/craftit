import Stripe from "stripe";

let stripeInstance = null;

/**
 * Lazy-load Stripe instance to avoid accessing env vars at build time
 * This ensures STRIPE_SECRET_KEY is only accessed when the module is actually used
 */
function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }
  return stripeInstance;
}

export default getStripe;
