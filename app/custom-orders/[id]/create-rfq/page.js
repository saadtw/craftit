// app/custom-orders/[id]/create-rfq/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPKR } from "@/lib/currency";

export default function CreateRFQ() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const toast = useToast();
  const [customOrder, setCustomOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [manufacturers, setManufacturers] = useState([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(false);
  const [manufacturerSearch, setManufacturerSearch] = useState("");

  const [formData, setFormData] = useState({
    duration: 168,
    minBidThreshold: "",
    broadcastToAll: true,
    targetManufacturers: [],
  });

  const linkedManufacturer = customOrder?.sourceManufacturerId;
  const linkedManufacturerId =
    linkedManufacturer?._id ||
    (typeof linkedManufacturer === "string" ? linkedManufacturer : null);
  const linkedManufacturerName =
    linkedManufacturer?.businessName ||
    linkedManufacturer?.name ||
    "Linked Manufacturer";

  const isProductCustomization = customOrder?.sourceType === "product_customization";

  const availableManufacturers = useMemo(() => {
    const map = new Map();
    for (const manufacturer of manufacturers)
      map.set(String(manufacturer._id), manufacturer);
    if (linkedManufacturerId && !map.has(String(linkedManufacturerId))) {
      map.set(String(linkedManufacturerId), {
        _id: String(linkedManufacturerId),
        businessName: linkedManufacturerName,
        name: linkedManufacturerName,
        verificationStatus: "verified",
      });
    }
    return Array.from(map.values());
  }, [manufacturers, linkedManufacturerId, linkedManufacturerName]);

  const selectedManufacturers = useMemo(() => {
    const byId = new Map(availableManufacturers.map((m) => [String(m._id), m]));
    return formData.targetManufacturers.map((id) => {
      const sid = String(id);
      return byId.get(sid) || { _id: sid, businessName: sid, name: sid };
    });
  }, [availableManufacturers, formData.targetManufacturers]);

  const fetchCustomOrder = useCallback(async () => {
    if (redirecting) return;
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`);
      const data = await response.json();
      if (data.success && data.order) {
        if (data.order.rfqId) {
          setRedirecting(true);
          toast.error(
            "RFQ already created for this order. Redirecting to RFQ details...",
          );
          router.push(
            `/customer/rfqs/${data.order.rfqId._id || data.order.rfqId}`,
          );
          return;
        }
        setCustomOrder(data.order);
        const lid =
          data.order?.sourceManufacturerId?._id ||
          data.order?.sourceManufacturerId;
        if (lid) {
          setFormData((prev) => ({
            ...prev,
            broadcastToAll: false,
            targetManufacturers: [String(lid)],
          }));
        }
      } else {
        }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  }, [params.id, router, toast, redirecting]);

  const fetchEligibleManufacturers = useCallback(async (searchTerm = "") => {
    setManufacturersLoading(true);
    try {
      const query = new URLSearchParams({
        page: "1",
        limit: "20",
        sort: "rating",
        verifiedOnly: "true",
      });
      const trimmed = searchTerm.trim();
      if (trimmed) query.set("search", trimmed);
      const response = await fetch(`/api/manufacturers/public?${query}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setManufacturers(
          Array.isArray(data.manufacturers) ? data.manufacturers : [],
        );
      } else {
        toast.error(data.error || "Failed to load manufacturers");
      }
    } catch (error) {
      toast.error("Error loading manufacturers: " + error.message);
    } finally {
      setManufacturersLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchCustomOrder();
    }
  }, [status, session, router, fetchCustomOrder]);

  useEffect(() => {
    if (formData.broadcastToAll) return;
    const timeout = setTimeout(
      () => fetchEligibleManufacturers(manufacturerSearch),
      250,
    );
    return () => clearTimeout(timeout);
  }, [formData.broadcastToAll, manufacturerSearch, fetchEligibleManufacturers]);

  const handleToggleManufacturer = (manufacturerId) => {
    const id = String(manufacturerId);
    if (linkedManufacturerId && id === String(linkedManufacturerId)) return;
    setFormData((prev) => {
      const exists = prev.targetManufacturers.includes(id);
      return {
        ...prev,
        targetManufacturers: exists
          ? prev.targetManufacturers.filter((cid) => cid !== id)
          : [...prev.targetManufacturers, id],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const duration = Number(formData.duration);
    if (!Number.isInteger(duration) || duration < 24 || duration > 720) {
      toast.error("RFQ duration must be an integer between 24 and 720 hours (30 days).");
      setLoading(false);
      return;
    }

    if (formData.minBidThreshold) {
      const threshold = Number(formData.minBidThreshold);
      if (isNaN(threshold) || threshold < 0) {
        toast.error("Minimum bid threshold must be a non-negative number.");
        setLoading(false);
        return;
      }
    }

    try {
      const requiredLinkedTargets = linkedManufacturerId
        ? [String(linkedManufacturerId)]
        : [];
      const finalTargetManufacturers = formData.broadcastToAll
        ? []
        : [
            ...new Set([
              ...formData.targetManufacturers,
              ...requiredLinkedTargets,
            ]),
          ];

      if (!formData.broadcastToAll && finalTargetManufacturers.length === 0) {
        toast.error("Please select at least one manufacturer for a targeted RFQ.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customOrderId: params.id,
          duration: Number(formData.duration),
          minBidThreshold: formData.minBidThreshold
            ? Number(formData.minBidThreshold)
            : undefined,
          broadcastToAll: formData.broadcastToAll,
          targetManufacturers: finalTargetManufacturers,
        }),
      });

      const data = await response.json();
      if (data.success) {
        router.push(`/customer/rfqs/${data.rfq._id}`);
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]/40 focus:bg-white/[0.06] transition-all";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2";

  if (status === "loading" || loading || redirecting) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!customOrder) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-white/15 block mb-3">
            inventory_2
          </span>
          <p className="text-sm text-white/40">Order not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <CustomerMainNavbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            Back
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728]">
              New RFQ
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Create RFQ Auction
            </h1>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-4">
            Order Details
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Title", value: customOrder.title, icon: "inventory_2" },
              {
                label: "Quantity",
                value: customOrder.quantity,
                icon: "numbers",
              },
              {
                label: "Budget",
                value: customOrder.budget
                  ? formatPKR(customOrder.budget)
                  : "Not specified",
                icon: "payments",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/6 bg-white/[0.03] p-3.5"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[13px] text-white/25">
                    {item.icon}
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                    {item.label}
                  </p>
                </div>
                <p className="text-sm font-bold text-white/75 truncate">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Duration & Threshold */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white">RFQ Settings</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Duration (hours) *</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  min="24"
                  required
                  className={inputClass}
                />
                <p className="text-[11px] text-white/30 mt-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">
                    schedule
                  </span>
                  {Math.floor(formData.duration / 24)} days
                </p>
              </div>

              <div>
                <label className={labelClass}>Min Bid Threshold (PKR)</label>
                <input
                  type="number"
                  value={formData.minBidThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minBidThreshold: e.target.value,
                    })
                  }
                  placeholder="Optional"
                  min="0"
                  className={inputClass}
                />
                <p className="text-[11px] text-white/30 mt-1.5">
                  Leave empty for no minimum
                </p>
              </div>
            </div>
          </div>

          {/* Broadcast Toggle */}
          {!isProductCustomization && (
            <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
              <h2 className="text-sm font-bold text-white">Targeting</h2>

            <div
              onClick={() =>
                setFormData((prev) => {
                  const shouldBroadcast = !prev.broadcastToAll;
                  if (shouldBroadcast) return { ...prev, broadcastToAll: true };
                  const withLinked = linkedManufacturerId
                    ? [
                        ...new Set([
                          ...prev.targetManufacturers,
                          String(linkedManufacturerId),
                        ]),
                      ]
                    : prev.targetManufacturers;
                  return {
                    ...prev,
                    broadcastToAll: false,
                    targetManufacturers: withLinked,
                  };
                })
              }
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                formData.broadcastToAll
                  ? "bg-[#eb9728]/10 border-[#eb9728]/30"
                  : "bg-white/[0.03] border-white/8 hover:border-white/15"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                    formData.broadcastToAll
                      ? "bg-[#eb9728]/20 text-[#eb9728]"
                      : "bg-white/[0.05] text-white/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    campaign
                  </span>
                </div>
                <div>
                  <p
                    className={`text-sm font-bold ${formData.broadcastToAll ? "text-[#eb9728]" : "text-white/70"}`}
                  >
                    Broadcast to All Manufacturers
                  </p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    Send RFQ to all verified manufacturers
                  </p>
                </div>
              </div>
              <div
                className={`h-5 w-9 rounded-full transition-all flex items-center px-0.5 ${
                  formData.broadcastToAll ? "bg-[#eb9728]" : "bg-white/15"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-all ${
                    formData.broadcastToAll ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>

            {/* Targeted Manufacturer Selector */}
            {!formData.broadcastToAll && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Search Manufacturers</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] text-white/25">
                      search
                    </span>
                    <input
                      type="text"
                      value={manufacturerSearch}
                      onChange={(e) => setManufacturerSearch(e.target.value)}
                      placeholder="Search verified manufacturers by nameΓÇª"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]/40 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-white/25 mt-1.5">
                    Only active verified manufacturers can be targeted.
                  </p>
                </div>

                {linkedManufacturerId && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/8">
                    <span className="material-symbols-outlined text-[14px] text-[#eb9728]">
                      link
                    </span>
                    <p className="text-[11px] text-[#eb9728]">
                      <span className="font-bold">
                        {linkedManufacturerName}
                      </span>{" "}
                      is auto-included and cannot be removed.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-white/30">
                    Selected:{" "}
                    <span className="font-bold text-white/60">
                      {selectedManufacturers.length}
                    </span>
                  </p>
                </div>

                {/* Manufacturer List */}
                <div className="max-h-56 overflow-y-auto rounded-xl border border-white/8 bg-[#050507] divide-y divide-white/5">
                  {manufacturersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <GlobalLoader text="Loading manufacturers..." />
                    </div>
                  ) : availableManufacturers.length === 0 ? (
                    <div className="py-10 text-center">
                      <span className="material-symbols-outlined text-3xl text-white/15 block mb-2">
                        search_off
                      </span>
                      <p className="text-sm text-white/30">
                        No verified manufacturers found.
                      </p>
                    </div>
                  ) : (
                    availableManufacturers.map((manufacturer) => {
                      const mid = String(manufacturer._id);
                      const isLinkedLocked =
                        linkedManufacturerId &&
                        mid === String(linkedManufacturerId);
                      const checked =
                        formData.targetManufacturers.includes(mid);

                      return (
                        <div
                          key={mid}
                          onClick={() => handleToggleManufacturer(mid)}
                          className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                            checked ? "bg-[#eb9728]/5" : "hover:bg-white/[0.03]"
                          } ${isLinkedLocked ? "cursor-default" : ""}`}
                        >
                          <div
                            className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              checked
                                ? "bg-[#eb9728] border-[#eb9728]"
                                : "border-white/20"
                            }`}
                          >
                            {checked && (
                              <span className="material-symbols-outlined text-[13px] text-white">
                                check
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/80 truncate">
                              {manufacturer.businessName || manufacturer.name}
                            </p>
                            <p className="text-[11px] text-white/30">
                              {isLinkedLocked
                                ? "Linked manufacturer (required)"
                                : "Verified manufacturer"}
                            </p>
                          </div>
                          {isLinkedLocked && (
                            <span className="material-symbols-outlined text-[14px] text-[#eb9728]">
                              lock
                            </span>
                          )}
                          {!isLinkedLocked &&
                            manufacturer.verificationStatus === "verified" && (
                              <span className="material-symbols-outlined text-[14px] text-emerald-400">
                                verified
                              </span>
                            )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            </div>
          )}

          {isProductCustomization && (
            <div className="rounded-2xl border border-[#eb9728]/20 bg-[#eb9728]/5 p-6 space-y-5">
              <h2 className="text-sm font-bold text-[#eb9728] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Targeting Locked
              </h2>
              <p className="text-sm text-[#eb9728]/90">
                This RFQ will be sent exclusively to <span className="font-bold">{linkedManufacturerName}</span>, the manufacturer of the product you requested customization for.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#eb9728] text-white text-sm font-bold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_8px_24px_rgba(235,151,40,0.2)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  gavel
                </span>
                Create RFQ
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

