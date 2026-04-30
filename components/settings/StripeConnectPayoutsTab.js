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
      <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6">
        <div className="py-6 flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-white/10 border-t-[#eb9728] rounded-full animate-spin" />
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
      <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Manufacturer Payout Onboarding
              </h3>
              <p className="text-sm text-white/35 mt-0.5">
                Configure your payout destination through Stripe Connect.
              </p>
            </div>
            <StatusBadge ready={onboardingReady} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                Connect Account
              </p>
              <p className="text-sm font-bold text-white/80">
                {status?.hasAccount
                  ? status?.stripeConnectAccountId || "Created"
                  : "Not created yet"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                Payouts Enabled
              </p>
              <p className="text-sm font-bold text-white/80">
                {status?.payoutsEnabled ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {/* Requirements */}
          {requirements.length > 0 && (
            <div className="rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#eb9728] mb-2">
                Stripe Needs More Information
              </p>
              <div className="flex flex-wrap gap-2">
                {requirements.map((req) => (
                  <span
                    key={req}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-[#eb9728]/10 border border-[#eb9728]/20 text-[#eb9728]"
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
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleAction("onboard")}
              disabled={busyAction === "onboard"}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                busyAction === "onboard"
                  ? "bg-[#eb9728]/40 border border-[#eb9728]/20 text-[#eb9728]/50 cursor-not-allowed"
                  : "bg-[#eb9728] text-black hover:bg-[#d4871f]"
              }`}
            >
              {busyAction === "onboard" ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#eb9728]/30 border-t-[#eb9728] rounded-full animate-spin" />
                  Opening Stripe…
                </>
              ) : status?.hasAccount ? (
                "Continue Onboarding"
              ) : (
                "Start Onboarding"
              )}
            </button>

            {status?.hasAccount && (
              <button
                type="button"
                onClick={() => handleAction("dashboard")}
                disabled={busyAction === "dashboard"}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  busyAction === "dashboard"
                    ? "border-white/8 text-white/20 cursor-not-allowed"
                    : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {busyAction === "dashboard"
                  ? "Opening…"
                  : "Open Stripe Dashboard"}
              </button>
            )}

            <button
              type="button"
              onClick={loadStatus}
              disabled={busyAction !== ""}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[15px]">
                refresh
              </span>
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 flex items-start gap-3">
        <span className="material-symbols-outlined text-white/25 text-[18px] shrink-0 mt-0.5">
          info
        </span>
        <p className="text-[12px] text-white/35 leading-relaxed">
          Customer payment cards and manufacturer payouts are separate by
          design. Card vaulting uses Stripe PaymentMethods for charging buyers,
          while manufacturer payouts use Stripe Connect onboarding and external
          payout rails.
        </p>
      </div>
    </div>
  );
}

// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";

// function StatusBadge({ ready }) {
//   return (
//     <span
//       className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
//         ready ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
//       }`}
//     >
//       {ready ? "Ready" : "Action Required"}
//     </span>
//   );
// }

// export default function StripeConnectPayoutsTab({ user }) {
//   const [status, setStatus] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [busyAction, setBusyAction] = useState("");
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const loadStatus = useCallback(async () => {
//     if (!user?._id) return;

//     setLoading(true);
//     setError("");

//     try {
//       const res = await fetch(`/api/users/${user._id}/payouts/connect`);
//       const data = await res.json();

//       if (!data.success) {
//         throw new Error(data.error || "Failed to load payout status");
//       }

//       setStatus(data);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [user?._id]);

//   useEffect(() => {
//     loadStatus();
//   }, [loadStatus]);

//   const requirements = useMemo(() => {
//     if (!status?.requirementsDue || !Array.isArray(status.requirementsDue)) {
//       return [];
//     }
//     return status.requirementsDue;
//   }, [status]);

//   const handleAction = async (action) => {
//     if (!user?._id) return;

//     setBusyAction(action);
//     setError("");
//     setSuccess("");

//     try {
//       const res = await fetch(`/api/users/${user._id}/payouts/connect`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ action }),
//       });
//       const data = await res.json();

//       if (!data.success) {
//         throw new Error(data.error || "Unable to continue");
//       }

//       setStatus(data);
//       if (data.url) {
//         window.location.assign(data.url);
//         return;
//       }

//       setSuccess(
//         action === "dashboard"
//           ? "Stripe dashboard link created."
//           : "Payout onboarding is ready.",
//       );
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setBusyAction("");
//     }
//   };

//   if (loading) {
//     return (
//       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
//         <div className="py-6 flex items-center justify-center">
//           <span className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
//         </div>
//       </div>
//     );
//   }

//   const onboardingReady = Boolean(status?.onboardingComplete);

//   return (
//     <div className="space-y-5">
//       {error && (
//         <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-100">
//           <span className="material-symbols-outlined text-base shrink-0">
//             error
//           </span>
//           {error}
//         </div>
//       )}

//       {success && (
//         <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm bg-green-50 text-green-700 border border-green-100">
//           <span className="material-symbols-outlined text-base shrink-0">
//             check_circle
//           </span>
//           {success}
//         </div>
//       )}

//       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
//         <div className="mb-5 pb-5 border-b border-gray-100">
//           <div className="flex items-center justify-between gap-3">
//             <div>
//               <h3 className="text-base font-bold text-gray-900">
//                 Manufacturer Payout Onboarding
//               </h3>
//               <p className="text-sm text-gray-400 mt-0.5">
//                 Configure your payout destination through Stripe Connect.
//               </p>
//             </div>
//             <StatusBadge ready={onboardingReady} />
//           </div>
//         </div>

//         <div className="space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
//             <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
//               <p className="text-gray-500">Connect Account</p>
//               <p className="font-semibold text-gray-900 mt-0.5">
//                 {status?.hasAccount
//                   ? status?.stripeConnectAccountId || "Created"
//                   : "Not created yet"}
//               </p>
//             </div>
//             <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
//               <p className="text-gray-500">Payouts Enabled</p>
//               <p className="font-semibold text-gray-900 mt-0.5">
//                 {status?.payoutsEnabled ? "Yes" : "No"}
//               </p>
//             </div>
//           </div>

//           {requirements.length > 0 && (
//             <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
//               <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1.5">
//                 Stripe Needs More Information
//               </p>
//               <div className="flex flex-wrap gap-2">
//                 {requirements.map((req) => (
//                   <span
//                     key={req}
//                     className="text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-700"
//                   >
//                     {String(req).replace(/_/g, " ")}
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}

//           {status?.disabledReason && (
//             <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
//               Payout status note:{" "}
//               {String(status.disabledReason).replace(/_/g, " ")}
//             </div>
//           )}

//           <div className="flex flex-wrap gap-2 pt-1">
//             <button
//               type="button"
//               onClick={() => handleAction("onboard")}
//               disabled={busyAction === "onboard"}
//               className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
//                 busyAction === "onboard"
//                   ? "bg-orange-400/60 cursor-not-allowed"
//                   : "bg-orange-500 hover:bg-orange-600"
//               }`}
//             >
//               {busyAction === "onboard" ? (
//                 <>
//                   <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
//                   Opening Stripe…
//                 </>
//               ) : status?.hasAccount ? (
//                 "Continue Onboarding"
//               ) : (
//                 "Start Onboarding"
//               )}
//             </button>

//             {status?.hasAccount && (
//               <button
//                 type="button"
//                 onClick={() => handleAction("dashboard")}
//                 disabled={busyAction === "dashboard"}
//                 className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
//                   busyAction === "dashboard"
//                     ? "border-gray-200 text-gray-400 cursor-not-allowed"
//                     : "border-gray-200 text-gray-700 hover:bg-gray-50"
//                 }`}
//               >
//                 {busyAction === "dashboard"
//                   ? "Opening…"
//                   : "Open Stripe Dashboard"}
//               </button>
//             )}

//             <button
//               type="button"
//               onClick={loadStatus}
//               disabled={busyAction !== ""}
//               className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
//             >
//               Refresh Status
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
//         Customer payment cards and manufacturer payouts are separate by design.
//         Card vaulting uses Stripe PaymentMethods for charging buyers, while
//         manufacturer payouts use Stripe Connect onboarding and external payout
//         rails.
//       </div>
//     </div>
//   );
// }
