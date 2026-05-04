"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function StatusBadge({ ready }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${
        ready
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]"
      }`}
    >
      {ready ? "Ready" : "Action Required"}
    </span>
  );
}

export default function StripeConnectPayoutsTab({ user }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStatus = useCallback(async () => {
    if (!user?._id) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/users/${user._id}/payouts/connect`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load payout status");
      }

      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const requirements = useMemo(() => {
    if (!status?.requirementsDue || !Array.isArray(status.requirementsDue)) {
      return [];
    }
    return status.requirementsDue;
  }, [status]);

  const handleAction = async (action) => {
    if (!user?._id) return;

    setBusyAction(action);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/users/${user._id}/payouts/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Unable to continue");
      }

      setStatus(data);
      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setSuccess(
        action === "dashboard"
          ? "Stripe dashboard link created."
          : "Payout onboarding is ready.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  };

  if (loading) {
    return (
      <div className="rounded-[2.5rem] border-2 border-purple-500/30 bg-white/[0.03] p-10">
        <div className="py-6 flex items-center justify-center">
          <span className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const onboardingReady = Boolean(status?.onboardingComplete);

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
          <span className="material-symbols-outlined text-base shrink-0">
            error
          </span>
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="material-symbols-outlined text-base shrink-0">
            check_circle
          </span>
          {success}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-[2.5rem] border-2 border-purple-500/30 bg-white/[0.03] overflow-hidden relative group transition-all duration-500 hover:border-purple-500/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] pointer-events-none group-hover:bg-purple-500/10 transition-all duration-700" />
        <div className="px-8 py-6 border-b border-purple-500/10 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                Manufacturer Payout Onboarding
              </h3>
              <p className="text-sm text-white/40 font-medium">
                Configure your payout destination through Stripe Connect.
              </p>
            </div>
            <StatusBadge ready={onboardingReady} />
          </div>
        </div>

        <div className="px-8 py-8 space-y-8 relative z-10">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="rounded-3xl border border-purple-500/20 bg-white/5 px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 mb-2">
                Connect Account
              </p>
              <p className="text-xs font-black text-white/70">
                {status?.hasAccount
                  ? status?.stripeConnectAccountId || "Created"
                  : "Not created yet"}
              </p>
            </div>
            <div className="rounded-3xl border border-purple-500/20 bg-white/5 px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 mb-2">
                Payouts Enabled
              </p>
              <p className="text-xs font-black text-white/70">
                {status?.payoutsEnabled ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {/* Requirements */}
          {requirements.length > 0 && (
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 px-6 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400 mb-4">
                Identity Verification Stream Incomplete
              </p>
              <div className="flex flex-wrap gap-2.5">
                {requirements.map((req) => (
                  <span
                    key={req}
                    className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest"
                  >
                    {String(req).replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Disabled reason */}
          {status?.disabledReason && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              Payout status note:{" "}
              {String(status.disabledReason).replace(/_/g, " ")}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAction("onboard")}
              disabled={busyAction === "onboard"}
              className={`inline-flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                busyAction === "onboard"
                  ? "bg-purple-600/30 text-white/30 cursor-not-allowed border border-white/5"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20 active:scale-95 text-white"
              }`}
            >
              {busyAction === "onboard" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Syncing…
                </>
              ) : status?.hasAccount ? (
                "Resume Onboarding"
              ) : (
                "Initialize Payouts"
              )}
            </button>

            {status?.hasAccount && (
              <button
                type="button"
                onClick={() => handleAction("dashboard")}
                disabled={busyAction === "dashboard"}
                className={`inline-flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  busyAction === "dashboard"
                    ? "border-white/5 text-white/20 cursor-not-allowed"
                    : "border-purple-500/20 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 active:scale-95"
                }`}
              >
                {busyAction === "dashboard"
                  ? "Initializing…"
                  : "Open Stripe Portal"}
              </button>
            )}

            <button
              type="button"
              onClick={loadStatus}
              disabled={busyAction !== ""}
              className="inline-flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              <span className="material-symbols-outlined text-sm font-black">
                refresh
              </span>
              Refresh Protocol
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 px-6 py-5 flex items-start gap-4">
        <span className="material-symbols-outlined text-purple-400 text-lg shrink-0 mt-0.5">
          info
        </span>
        <p className="text-xs text-white/30 font-medium leading-relaxed">
          Customer payment vectors and manufacturer payout streams are architecturally decoupled for maximum security. 
          Card vaulting uses Stripe PaymentMethods for buyer-side ingestion, while payouts utilize the Stripe Connect network protocols for localized settlement.
        </p>
      </div>
    </div>
  );
}
