
// app/customer/group-buys/[id]/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function useCountdown(endDate) {
  const calc = useCallback(() => {
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
  }, [endDate]);

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);

  return time;
}

function TimeSegment({ value, label }) {
  return (
    <div className="flex min-w-[64px] flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="font-mono text-2xl font-black tabular-nums text-white">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
        {label}
      </span>
    </div>
  );
}

function TierProgress({ tiers, currentQuantity, currentTierIndex }) {
  const maxQty = tiers[tiers.length - 1]?.minQuantity || 1;
  const pct = Math.min((currentQuantity / maxQty) * 100, 100);

  return (
    <div className="space-y-5">
      <div className="relative">
        <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#eb9728] to-purple-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {tiers.map((tier, i) => {
          const pos = (tier.minQuantity / maxQty) * 100;
          const unlocked = currentQuantity >= tier.minQuantity;

          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos}%` }}
            >
              <div
                className={`h-4 w-4 rounded-full border-2 shadow-sm ${
                  unlocked
                    ? "border-[#eb9728] bg-[#eb9728]"
                    : "border-white/20 bg-[#0c0c11]"
                }`}
              />
            </div>
          );
        })}
      </div>

      <div
        className={`grid gap-3 ${
          tiers.length === 1
            ? "grid-cols-1"
            : tiers.length === 2
              ? "grid-cols-2"
              : "grid-cols-1 sm:grid-cols-3"
        }`}
      >
        {tiers.map((tier, i) => {
          const unlocked = currentQuantity >= tier.minQuantity;
          const isActive = i === currentTierIndex;

          return (
            <div
              key={i}
              className={`relative rounded-[20px] border p-4 transition-all ${
                isActive
                  ? "border-[#eb9728]/40 bg-[#eb9728]/10"
                  : unlocked
                    ? "border-emerald-500/25 bg-emerald-500/10"
                    : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[#eb9728] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                    Active
                  </span>
                </div>
              )}

              <div className="mt-1 text-center">
                <p className="text-xs text-white/40">Tier {tier.tierNumber}</p>
                <p
                  className={`mt-1 text-3xl font-black ${
                    isActive
                      ? "text-[#eb9728]"
                      : unlocked
                        ? "text-emerald-300"
                        : "text-white/35"
                  }`}
                >
                  {tier.discountPercent}%
                </p>
                <p className="text-xs text-white/35">off</p>

                <div className="mt-3 border-t border-white/8 pt-3">
                  <p className="text-sm font-bold text-white">
                    ${tier.discountedPrice.toFixed(2)}
                  </p>
                  <p className="mt-1 text-[10px] text-white/35">
                    {tier.minQuantity}+ units
                  </p>
                </div>
              </div>

              {unlocked && !isActive && (
                <div className="absolute right-3 top-3 text-emerald-300">
                  <span className="material-symbols-outlined text-base">
                    check_circle
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentTierIndex < tiers.length - 1 ? (
        <p className="text-center text-xs text-white/45">
          <span className="font-bold text-[#eb9728]">
            {tiers[currentTierIndex + 1].minQuantity - currentQuantity} more
            units
          </span>{" "}
          needed to unlock{" "}
          <span className="font-bold text-white">
            {tiers[currentTierIndex + 1].discountPercent}% off
          </span>
        </p>
      ) : (
        <p className="text-center text-xs font-bold text-emerald-300">
          Maximum discount tier unlocked.
        </p>
      )}
    </div>
  );
}

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
        fetchGroupBuy();
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
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#eb9728]" />
          <p className="text-sm text-white/45">Loading group buy...</p>
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
      <div className="flex min-h-screen items-center justify-center bg-[#050507] text-white">
        <div className="text-center">
          <p className="mb-4 text-white/50">Group buy not found.</p>
          <Link
            href="/customer/group-buys"
            className="font-semibold text-[#eb9728] hover:text-amber-400"
          >
            ← Back to Group Buys
          </Link>
        </div>
      </div>
    );
  }

  const displayPrice = groupBuy.currentDiscountedPrice ?? groupBuy.basePrice;
  const isActive = groupBuy.status === "active";
  const isFull =
    groupBuy.maxParticipants &&
    groupBuy.currentParticipantCount >= groupBuy.maxParticipants;

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
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <div className="mb-5 flex items-center gap-2 text-sm text-white/35">
          <Link
            href="/customer/group-buys"
            className="hover:text-[#eb9728] transition-colors"
          >
            Group Buys
          </Link>
          <span>/</span>
          <span className="max-w-xs truncate text-white/60">
            {groupBuy.title}
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.65fr_0.85fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0c0c11]">
              <div className="relative h-[320px] sm:h-[420px]">
                {groupBuy.productId?.images?.[0]?.url ? (
                  <Image
                    src={groupBuy.productId.images[0].url}
                    alt={groupBuy.productId.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
                    <span className="material-symbols-outlined text-7xl text-white/15">
                      inventory_2
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/35 to-transparent" />

                <div className="absolute left-5 top-5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                        : groupBuy.status === "completed"
                          ? "bg-white/10 text-white/70 border border-white/10"
                          : "bg-[#eb9728]/15 text-[#eb9728] border border-[#eb9728]/25"
                    }`}
                  >
                    {groupBuy.status.charAt(0).toUpperCase() +
                      groupBuy.status.slice(1)}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                    {groupBuy.productId?.category}
                  </p>
                  <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {groupBuy.title}
                  </h1>
                  <p className="mt-2 text-sm text-white/55">
                    by{" "}
                    <span className="font-semibold text-white/80">
                      {groupBuy.manufacturerId?.businessName ||
                        groupBuy.manufacturerId?.name}
                    </span>
                  </p>
                </div>
              </div>

              {groupBuy.description && (
                <div className="border-t border-white/8 p-5 sm:p-6">
                  <h2 className="mb-2 text-sm font-bold text-white">
                    Campaign Description
                  </h2>
                  <p className="max-w-4xl text-sm leading-7 text-white/55">
                    {groupBuy.description}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Discount Tiers
                  </h2>
                  <p className="mt-1 text-xs text-white/40">
                    More combined units unlock better pricing for everyone.
                  </p>
                </div>
                <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
                  {groupBuy.currentQuantity} units
                </div>
              </div>

              <TierProgress
                tiers={groupBuy.tiers}
                currentQuantity={groupBuy.currentQuantity}
                currentTierIndex={groupBuy.currentTierIndex}
              />
            </div>

            {groupBuy.termsAndConditions && (
              <div className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6">
                <h2 className="mb-3 text-sm font-bold text-white">
                  Terms & Conditions
                </h2>
                <p className="whitespace-pre-line text-sm leading-7 text-white/50">
                  {groupBuy.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-5">
              <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-white/35">
                Time Remaining
              </p>

              {countdown?.done ? (
                <p className="text-center font-bold text-red-300">
                  Campaign ended
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {countdown?.days > 0 && (
                    <TimeSegment value={countdown.days} label="Days" />
                  )}
                  <TimeSegment value={countdown?.hours ?? 0} label="Hrs" />
                  <TimeSegment value={countdown?.minutes ?? 0} label="Min" />
                  <TimeSegment value={countdown?.seconds ?? 0} label="Sec" />
                </div>
              )}

              <p className="mt-4 text-center text-xs text-white/35">
                Ends{" "}
                {new Date(groupBuy.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-5">
              <div className="mb-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#eb9728]">
                    ${displayPrice.toFixed(2)}
                  </span>
                  {groupBuy.currentTierIndex >= 0 && (
                    <span className="text-base text-white/30 line-through">
                      ${groupBuy.basePrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/40">
                  Current price per unit
                </p>
              </div>

              <div className="mb-5 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/45">Participants</span>
                  <span className="font-bold text-white">
                    {groupBuy.currentParticipantCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/45">Total units ordered</span>
                  <span className="font-bold text-white">
                    {groupBuy.currentQuantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/45">Min. participants</span>
                  <span className="font-bold text-white">
                    {groupBuy.minParticipants}
                  </span>
                </div>
                {groupBuy.maxParticipants && (
                  <div className="flex justify-between">
                    <span className="text-white/45">Spots remaining</span>
                    <span className="font-bold text-white">
                      {groupBuy.maxParticipants -
                        groupBuy.currentParticipantCount}
                    </span>
                  </div>
                )}
              </div>

              {hasJoined && myParticipation && (
                <div className="mb-5 rounded-2xl border border-[#eb9728]/20 bg-[#eb9728]/10 p-4">
                  <p className="mb-3 text-xs font-bold text-[#eb9728]">
                    You are participating
                  </p>
                  <div className="space-y-2 text-xs text-white/60">
                    <div className="flex justify-between">
                      <span>Your quantity:</span>
                      <span className="font-bold text-white">
                        {myParticipation.quantity} units
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Locked price:</span>
                      <span className="font-bold text-white">
                        ${myParticipation.unitPrice?.toFixed(2)}/unit
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your total:</span>
                      <span className="font-bold text-white">
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

              {session.user.role === "customer" && (
                <>
                  {!isActive ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-center">
                      <p className="text-sm text-white/45">
                        {groupBuy.status === "completed"
                          ? "This campaign has ended."
                          : groupBuy.status === "cancelled"
                            ? "This campaign was cancelled."
                            : "Campaign not yet active."}
                      </p>
                    </div>
                  ) : isFull && !hasJoined ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-center">
                      <p className="text-sm font-bold text-white/55">
                        Campaign is full
                      </p>
                    </div>
                  ) : hasJoined ? (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full rounded-xl border border-red-500/25 bg-red-500/10 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {cancelling ? "Cancelling…" : "Cancel My Participation"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="w-full rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-white transition-colors hover:bg-amber-500"
                    >
                      Join Group Buy
                    </button>
                  )}
                </>
              )}

              {session.user.role !== "customer" && (
                <p className="text-center text-xs text-white/35">
                  Login as a customer to join.
                </p>
              )}
            </div>

            {isActive && (
              <div className="rounded-[24px] border border-purple-500/20 bg-purple-500/10 p-4 text-center">
                <p className="mb-1 text-xs font-bold text-purple-300">
                  Help unlock better tiers
                </p>
                <p className="text-xs leading-5 text-white/45">
                  The more units ordered, the better everyone&apos;s final
                  price.
                </p>
              </div>
            )}
          </aside>
        </section>
      </main>

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 shadow-2xl">
            <h2 className="text-xl font-black text-white">Join Group Buy</h2>
            <p className="mt-1 mb-5 text-sm text-white/45">{groupBuy.title}</p>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold text-white/70">
                How many units?
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xl font-bold text-white/65 hover:text-white"
                >
                  −
                </button>
                <span className="min-w-10 text-center text-2xl font-black text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xl font-bold text-white/65 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-5 space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm">
              <div className="flex justify-between text-white/45">
                <span>Estimated unit price</span>
                <span className="font-bold text-white">
                  ${estimatedUnitPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-white/45">
                <span>Quantity</span>
                <span className="font-bold text-white">× {quantity}</span>
              </div>
              <div className="flex justify-between border-t border-white/8 pt-3">
                <span className="font-bold text-white">Estimated total</span>
                <span className="text-lg font-black text-[#eb9728]">
                  ${(estimatedUnitPrice * quantity).toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-white/35">
                Final price is locked at campaign close based on total units
                reached.
              </p>
            </div>

            {groupBuy.termsAndConditions && (
              <p className="mb-5 text-xs text-white/40">
                By joining, you agree to the campaign&apos;s{" "}
                <span className="font-bold text-[#eb9728]">
                  terms & conditions
                </span>
                .
              </p>
            )}

            {error && <p className="mb-3 text-sm text-red-300">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setError("");
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/65 hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-60"
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
