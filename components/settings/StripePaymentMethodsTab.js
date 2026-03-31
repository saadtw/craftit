"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const stripePromise =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

const cardStyle = {
  style: {
    base: {
      color: "#1f2937",
      fontSize: "14px",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "#dc2626",
    },
  },
};

function PaymentMethodList({
  methods,
  loading,
  busyId,
  onSetDefault,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (methods.length === 0) {
    return <p className="text-sm text-gray-500">No payment methods saved yet.</p>;
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <div
          key={method._id}
          className="border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-bold text-gray-900 capitalize">
              {method.brand || "card"} •••• {method.last4}
              {method.isDefault && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">
                  Default
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Stripe card · Expires{" "}
              {String(method.expMonth || "").padStart(2, "0")}/
              {method.expYear || "--"}
              {method.nickname ? ` · ${method.nickname}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!method.isDefault && (
              <button
                type="button"
                disabled={busyId === method._id}
                onClick={() => onSetDefault(method._id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Make Default
              </button>
            )}
            <button
              type="button"
              disabled={busyId === method._id}
              onClick={() => onDelete(method._id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddCardForm({ user, methods, onAdded, setError, setSuccess }) {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [nickname, setNickname] = useState("");

  const initializeSetupIntent = useCallback(async () => {
    if (!user?._id) return;
    setLoadingSetup(true);
    setError("");

    try {
      const res = await fetch(
        `/api/users/${user._id}/payment-methods/setup-intent`,
        {
          method: "POST",
        },
      );
      const data = await res.json();

      if (!data.success || !data.clientSecret) {
        throw new Error(data.error || "Failed to initialize card setup");
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSetup(false);
    }
  }, [user?._id, setError]);

  useEffect(() => {
    initializeSetupIntent();
  }, [initializeSetupIntent]);

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe is still loading. Please try again.");
      return;
    }

    if (!clientSecret) {
      setError("Card setup is not initialized yet.");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Card input is not ready yet.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const setupResult = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: holderName.trim() || user?.name || undefined,
            email: user?.email || undefined,
          },
        },
      });

      if (setupResult.error) {
        throw new Error(setupResult.error.message || "Card setup failed");
      }

      if (!setupResult.setupIntent?.id) {
        throw new Error("Card setup did not complete. Please retry.");
      }

      const saveRes = await fetch(`/api/users/${user._id}/payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupIntentId: setupResult.setupIntent.id,
          holderName: holderName.trim(),
          nickname: nickname.trim(),
          isDefault: methods.length === 0,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveData.success) {
        throw new Error(saveData.error || "Failed to save payment method");
      }

      onAdded(saveData.paymentMethods || []);
      setHolderName("");
      setNickname("");
      setSuccess("Payment method saved securely with Stripe.");

      await initializeSetupIntent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleAdd} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Card Holder Name
          </label>
          <input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
            placeholder="Name on card"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Nickname (optional)
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
            placeholder="Personal Visa"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Card Details
          </label>
          <div className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-orange-400/40 focus-within:border-orange-400">
            <CardElement options={cardStyle} />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        Card details are collected by Stripe Elements. Craftit stores only
        non-sensitive card metadata and Stripe payment method IDs.
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || loadingSetup || !stripe || !elements}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
            submitting || loadingSetup || !stripe || !elements
              ? "bg-orange-400/60 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 shadow-sm"
          }`}
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : loadingSetup ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Preparing…
            </>
          ) : (
            "Add Payment Method"
          )}
        </button>
      </div>
    </form>
  );
}

function StripePaymentMethodsInner({ user }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMethods = useCallback(async () => {
    if (!user?._id) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/users/${user._id}/payment-methods`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load cards");
      setMethods(data.paymentMethods || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const handleSetDefault = async (paymentMethodId) => {
    setBusyId(paymentMethodId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/users/${user._id}/payment-methods`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to set default payment method");
      }

      setMethods(data.paymentMethods || []);
      setSuccess("Default payment method updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (paymentMethodId) => {
    setBusyId(paymentMethodId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/users/${user._id}/payment-methods?paymentMethodId=${paymentMethodId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to remove payment method");
      }

      setMethods(data.paymentMethods || []);
      setSuccess("Payment method removed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  const stripeConfigMissing = !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-100">
          <span className="material-symbols-outlined text-base shrink-0">
            error
          </span>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm bg-green-50 text-green-700 border border-green-100">
          <span className="material-symbols-outlined text-base shrink-0">
            check_circle
          </span>
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-5 pb-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            Saved Payment Methods
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Stripe tokenized cards for checkout and future charges.
          </p>
        </div>
        <PaymentMethodList
          methods={methods}
          loading={loading}
          busyId={busyId}
          onSetDefault={handleSetDefault}
          onDelete={handleDelete}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-5 pb-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            Add Payment Method
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Save a card securely with Stripe Elements. Raw card numbers never
            touch your API.
          </p>
        </div>

        {stripeConfigMissing ? (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
            Stripe publishable key is missing. Set
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card saving.
          </div>
        ) : (
          <AddCardForm
            user={user}
            methods={methods}
            onAdded={setMethods}
            setError={setError}
            setSuccess={setSuccess}
          />
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
        Manufacturer payouts are not configured through customer cards. Use
        Stripe Connect external accounts for payout rails in a separate
        onboarding flow.
      </div>
    </div>
  );
}

export default function StripePaymentMethodsTab({ user }) {
  const options = useMemo(
    () => ({
      appearance: {
        theme: "stripe",
      },
    }),
    [],
  );

  if (!stripePromise) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-amber-700">
        Stripe is not configured yet. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to
        enable payment method setup.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentMethodsInner user={user} />
    </Elements>
  );
}
