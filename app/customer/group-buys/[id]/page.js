"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import CustomerSidebar from "@/components/CustomerSidebar";

// ─── Countdown hook ──────────────────────────────────────────────────────────
function useCountdown(endDate) {
  const calc = () => {
    if (!endDate)
      return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    const diff = new Date(endDate) - Date.now();
    if (diff <= 0)
      return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: false,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [endDate]);
  return time;
}

// ─── Timer segment ────────────────────────────────────────────────────────────
function TimeSegment({ value, label }) {
  return (
    <div className="flex flex-col items-center bg-white rounded-xl px-4 py-3 shadow-sm border border-amber-100 min-w-[60px]">
      <span className="text-2xl font-bold text-gray-900 font-mono tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Tier progress visualization ──────────────────────────────────────────────
function TierProgress({ tiers, currentQuantity, currentTierIndex }) {
  const maxQty = tiers[tiers.length - 1]?.minQuantity || 1;
  const pct = Math.min((currentQuantity / maxQty) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Track */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background:
                pct >= 100
                  ? "#22c55e"
                  : "linear-gradient(90deg, #fcd34d 0%, #eb9728 100%)",
            }}
          />
        </div>
        {/* Tier markers on the track */}
        {tiers.map((tier, i) => {
          const pos = (tier.minQuantity / maxQty) * 100;
          const unlocked = currentQuantity >= tier.minQuantity;
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${pos}%` }}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  unlocked
                    ? "bg-amber-500 border-amber-600"
                    : "bg-white border-gray-300"
                } shadow-sm`}
              />
            </div>
          );
        })}
      </div>

      {/* Tier cards */}
      <div
        className={`grid gap-3 ${tiers.length === 1 ? "grid-cols-1" : tiers.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {tiers.map((tier, i) => {
          const unlocked = currentQuantity >= tier.minQuantity;
          const isActive = i === currentTierIndex;
          return (
            <div
              key={i}
              className={`relative rounded-xl p-3 border transition-all ${
                isActive
                  ? "border-amber-400 bg-amber-50 shadow-sm"
                  : unlocked
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-white"
              }`}
            >
              {isActive && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    Active
                  </span>
                </div>
              )}
              <div className="text-center mt-1">
                <p className="text-xs text-gray-500 mb-0.5">
                  Tier {tier.tierNumber}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isActive
                      ? "text-amber-600"
                      : unlocked
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {tier.discountPercent}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">off</p>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">
                    ${tier.discountedPrice.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {tier.minQuantity}+ units
                  </p>
                </div>
              </div>
              {unlocked && !isActive && (
                <div className="absolute top-2 right-2">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Units until next tier */}
      {currentTierIndex < tiers.length - 1 && (
        <p className="text-xs text-center text-gray-500">
          {(() => {
            const nextTier = tiers[currentTierIndex + 1];
            const needed = nextTier.minQuantity - currentQuantity;
            return (
              <>
                <span className="font-semibold text-amber-600">
                  {needed} more units
                </span>{" "}
                needed to unlock{" "}
                <span className="font-semibold">
                  {nextTier.discountPercent}% off
                </span>
              </>
            );
          })()}
        </p>
      )}
      {currentTierIndex === tiers.length - 1 && (
        <p className="text-xs text-center text-green-600 font-semibold">
          🎉 Maximum discount tier unlocked!
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GroupBuyDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [groupBuy, setGroupBuy] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [myParticipation, setMyParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const countdown = useCountdown(groupBuy?.endDate);

  const fetchGroupBuy = useCallback(async () => {
    try {
      const res = await fetch(`/api/group-buys/${id}/public`);
      const data = await res.json();
      if (data.success) {
        setGroupBuy(data.groupBuy);
        setHasJoined(data.hasJoined);
        setMyParticipation(data.myParticipation);
      } else {
        setError("Group buy not found.");
      }
    } catch (err) {
      setError("Failed to load group buy.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status !== "loading") fetchGroupBuy();
  }, [fetchGroupBuy, status]);

  const handleJoin = async () => {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/group-buys/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(
          `You've successfully joined! Your spot is reserved for ${quantity} unit${quantity > 1 ? "s" : ""}.`,
        );
        setShowJoinModal(false);
        fetchGroupBuy(); // refresh state
      } else {
        setError(data.error || "Failed to join group buy.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your participation? Your spot will be released.",
      )
    )
      return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`/api/group-buys/${id}/join`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Your participation has been cancelled.");
        fetchGroupBuy();
      } else {
        setError(data.error || "Failed to cancel participation.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setCancelling(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f6] flex">
        <CustomerSidebar active="group-buys" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    router.replace("/auth/login");
    return null;
  }

  if (!groupBuy) {
    return (
      <div className="min-h-screen bg-[#f8f7f6] flex">
        <CustomerSidebar active="group-buys" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Group buy not found.</p>
            <Link
              href="/customer/group-buys"
              className="text-amber-600 font-medium hover:underline"
            >
              ← Back to Group Buys
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const maxQty = groupBuy.tiers[groupBuy.tiers.length - 1]?.minQuantity || 1;
  const displayPrice = groupBuy.currentDiscountedPrice ?? groupBuy.basePrice;
  const isActive = groupBuy.status === "active";
  const isFull =
    groupBuy.maxParticipants &&
    groupBuy.currentParticipantCount >= groupBuy.maxParticipants;

  // Estimated price for the quantity being considered
  const estimatedUnitPrice = (() => {
    const projectedQty = groupBuy.currentQuantity + (hasJoined ? 0 : quantity);
    let price = groupBuy.basePrice;
    for (let i = groupBuy.tiers.length - 1; i >= 0; i--) {
      if (projectedQty >= groupBuy.tiers[i].minQuantity) {
        price = groupBuy.tiers[i].discountedPrice;
        break;
      }
    }
    return price;
  })();

  return (
    <div className="min-h-screen bg-[#f8f7f6] flex">
      <CustomerSidebar active="group-buys" />

      <div className="flex-1 p-6 lg:p-8 overflow-auto max-w-6xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link
            href="/customer/group-buys"
            className="hover:text-amber-600 transition-colors"
          >
            Group Buys
          </Link>
          <span>/</span>
          <span className="text-gray-600 truncate max-w-xs">
            {groupBuy.title}
          </span>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product + Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Product image */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="relative h-64 sm:h-80">
                {groupBuy.productId?.images?.[0] ? (
                  <Image
                    src={groupBuy.productId.images[0]}
                    alt={groupBuy.productId.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                    <svg
                      className="w-24 h-24 text-gray-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-4 left-4">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      isActive
                        ? "bg-green-500 text-white"
                        : groupBuy.status === "completed"
                          ? "bg-gray-500 text-white"
                          : "bg-yellow-400 text-yellow-900"
                    }`}
                  >
                    {groupBuy.status.charAt(0).toUpperCase() +
                      groupBuy.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">
                  {groupBuy.productId?.category}
                </p>
                <h1 className="text-xl font-bold text-gray-900 mb-1">
                  {groupBuy.title}
                </h1>
                <p className="text-sm text-gray-500">
                  by{" "}
                  <span className="text-gray-700 font-medium">
                    {groupBuy.manufacturerId?.businessName ||
                      groupBuy.manufacturerId?.name}
                  </span>
                </p>
                {groupBuy.description && (
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                    {groupBuy.description}
                  </p>
                )}
              </div>
            </div>

            {/* Tier progress */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Discount Tiers
              </h2>
              <TierProgress
                tiers={groupBuy.tiers}
                currentQuantity={groupBuy.currentQuantity}
                currentTierIndex={groupBuy.currentTierIndex}
              />
            </div>

            {/* Terms */}
            {groupBuy.termsAndConditions && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-3 text-sm">
                  Terms & Conditions
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                  {groupBuy.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          {/* Right: Sticky action card */}
          <div className="space-y-5">
            {/* Countdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3 text-center">
                Time Remaining
              </p>
              {countdown?.done ? (
                <p className="text-center text-red-500 font-semibold">
                  Campaign ended
                </p>
              ) : (
                <div className="flex justify-center gap-2">
                  {countdown?.days > 0 && (
                    <TimeSegment value={countdown.days} label="Days" />
                  )}
                  <TimeSegment value={countdown?.hours ?? 0} label="Hrs" />
                  <TimeSegment value={countdown?.minutes ?? 0} label="Min" />
                  <TimeSegment value={countdown?.seconds ?? 0} label="Sec" />
                </div>
              )}
              <p className="text-center text-xs text-gray-400 mt-3">
                Ends{" "}
                {new Date(groupBuy.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Pricing & stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-gray-900">
                  ${displayPrice.toFixed(2)}
                </span>
                {groupBuy.currentTierIndex >= 0 && (
                  <span className="text-base text-gray-400 line-through">
                    ${groupBuy.basePrice.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Current price per unit
              </p>

              <div className="space-y-2 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Participants</span>
                  <span className="font-semibold text-gray-800">
                    {groupBuy.currentParticipantCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total units ordered</span>
                  <span className="font-semibold text-gray-800">
                    {groupBuy.currentQuantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Min. participants</span>
                  <span className="font-semibold text-gray-800">
                    {groupBuy.minParticipants}
                  </span>
                </div>
                {groupBuy.maxParticipants && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Spots remaining</span>
                    <span className="font-semibold text-gray-800">
                      {groupBuy.maxParticipants -
                        groupBuy.currentParticipantCount}
                    </span>
                  </div>
                )}
              </div>

              {/* My participation */}
              {hasJoined && myParticipation && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-xs font-semibold text-amber-700 mb-1.5">
                    ✓ You&apos;re participating
                  </p>
                  <div className="space-y-1 text-xs text-amber-600">
                    <div className="flex justify-between">
                      <span>Your quantity:</span>
                      <span className="font-semibold">
                        {myParticipation.quantity} units
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Locked price:</span>
                      <span className="font-semibold">
                        ${myParticipation.unitPrice?.toFixed(2)}/unit
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your total:</span>
                      <span className="font-semibold">
                        ${myParticipation.totalPrice?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Joined:</span>
                      <span>
                        {new Date(
                          myParticipation.joinedAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA — customer only */}
              {session.user.role === "customer" && (
                <>
                  {!isActive ? (
                    <div className="text-center py-3">
                      <p className="text-sm text-gray-500">
                        {groupBuy.status === "completed"
                          ? "This campaign has ended."
                          : groupBuy.status === "cancelled"
                            ? "This campaign was cancelled."
                            : "Campaign not yet active."}
                      </p>
                    </div>
                  ) : isFull && !hasJoined ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                      <p className="text-sm text-gray-500 font-medium">
                        Campaign is full
                      </p>
                    </div>
                  ) : hasJoined ? (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {cancelling ? "Cancelling…" : "Cancel My Participation"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="w-full py-3 rounded-xl bg-[#eb9728] hover:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm"
                    >
                      Join Group Buy
                    </button>
                  )}
                </>
              )}

              {session.user.role !== "customer" && (
                <p className="text-center text-xs text-gray-400">
                  Login as a customer to join.
                </p>
              )}
            </div>

            {/* Share nudge */}
            {isActive && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-amber-700 mb-1">
                  Help unlock better tiers!
                </p>
                <p className="text-xs text-amber-600">
                  Share this group buy with friends — the more units ordered,
                  the bigger everyone&apos;s discount.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Join Modal ─────────────────────────────────────────────────── */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Join Group Buy
            </h2>
            <p className="text-sm text-gray-500 mb-5">{groupBuy.title}</p>

            {/* Quantity selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many units?
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-lg font-medium"
                >
                  −
                </button>
                <span className="text-xl font-bold text-gray-900 min-w-8 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-lg font-medium"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price preview */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Estimated unit price</span>
                <span className="font-semibold text-gray-800">
                  ${estimatedUnitPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Quantity</span>
                <span className="font-semibold text-gray-800">
                  × {quantity}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-semibold text-gray-800">
                  Estimated total
                </span>
                <span className="font-bold text-lg text-amber-600">
                  ${(estimatedUnitPrice * quantity).toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                * Final price is locked at campaign close based on total units
                reached.
              </p>
            </div>

            {/* Terms notice */}
            {groupBuy.termsAndConditions && (
              <p className="text-xs text-gray-400 mb-5">
                By joining, you agree to the campaign&apos;s{" "}
                <span className="text-amber-600 font-medium">
                  terms & conditions
                </span>
                .
              </p>
            )}

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setError("");
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1 py-3 rounded-xl bg-[#eb9728] hover:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-60"
              >
                {joining ? "Joining…" : "Confirm & Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
