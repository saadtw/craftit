// app/custom-orders/[id]/create-rfq/page.js
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";

export default function CreateRFQ() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [customOrder, setCustomOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manufacturers, setManufacturers] = useState([]);
  const [manufacturersLoading, setManufacturersLoading] = useState(false);
  const [manufacturerSearch, setManufacturerSearch] = useState("");

  const [formData, setFormData] = useState({
    duration: 168, // 7 days in hours
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

  const availableManufacturers = useMemo(() => {
    const map = new Map();

    for (const manufacturer of manufacturers) {
      map.set(String(manufacturer._id), manufacturer);
    }

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
    const byId = new Map(
      availableManufacturers.map((manufacturer) => [
        String(manufacturer._id),
        manufacturer,
      ]),
    );

    return formData.targetManufacturers.map((manufacturerId) => {
      const id = String(manufacturerId);
      return (
        byId.get(id) || {
          _id: id,
          businessName: id,
          name: id,
        }
      );
    });
  }, [availableManufacturers, formData.targetManufacturers]);

  const fetchCustomOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`, {});
      const data = await response.json();

      if (data.success && data.order) {
        // Check if RFQ already exists
        if (data.order.rfqId) {
          alert(
            "RFQ already created for this order. Redirecting to RFQ details...",
          );
          router.push(
            `/customer/rfqs/${data.order.rfqId._id || data.order.rfqId}`,
          );
          return;
        }
        setCustomOrder(data.order);

        const linkedManufacturerId =
          data.order?.sourceManufacturerId?._id ||
          data.order?.sourceManufacturerId;

        if (linkedManufacturerId) {
          setFormData((prev) => ({
            ...prev,
            broadcastToAll: false,
            targetManufacturers: [String(linkedManufacturerId)],
          }));
        }
      } else {
        alert("Error loading order: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error loading order: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  const fetchEligibleManufacturers = useCallback(async (searchTerm = "") => {
    setManufacturersLoading(true);
    try {
      const query = new URLSearchParams({
        page: "1",
        limit: "20",
        sort: "rating",
        verifiedOnly: "true",
      });

      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        query.set("search", trimmedSearch);
      }

      const response = await fetch(`/api/manufacturers/public?${query}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setManufacturers(
          Array.isArray(data.manufacturers) ? data.manufacturers : [],
        );
      } else {
        alert(data.error || "Failed to load manufacturers");
      }
    } catch (error) {
      alert("Error loading manufacturers: " + error.message);
    } finally {
      setManufacturersLoading(false);
    }
  }, []);

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
    if (formData.broadcastToAll) {
      return;
    }

    const timeout = setTimeout(() => {
      fetchEligibleManufacturers(manufacturerSearch);
    }, 250);

    return () => clearTimeout(timeout);
  }, [formData.broadcastToAll, manufacturerSearch, fetchEligibleManufacturers]);

  const handleToggleManufacturer = (manufacturerId) => {
    const id = String(manufacturerId);
    if (linkedManufacturerId && id === String(linkedManufacturerId)) {
      return;
    }

    setFormData((prev) => {
      const exists = prev.targetManufacturers.includes(id);
      return {
        ...prev,
        targetManufacturers: exists
          ? prev.targetManufacturers.filter((currentId) => currentId !== id)
          : [...prev.targetManufacturers, id],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
        alert("Please select at least one manufacturer for a targeted RFQ.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/rfqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        alert("RFQ created successfully!");
        router.push(`/customer/rfqs/${data.rfq._id}`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) return <div>Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!customOrder) return <div>Order not found</div>;

  return (
    <div className="min-h-screen bg-[#f8f7f6]">
      <CustomerMainNavbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Create RFQ (Auction)</h1>
        </div>

        <div className="bg-gray-100 p-4 rounded mb-6">
          <h2 className="font-bold mb-2">Order Details:</h2>
          <p>
            <strong>Title:</strong> {customOrder.title}
          </p>
          <p>
            <strong>Quantity:</strong> {customOrder.quantity}
          </p>
          <p>
            <strong>Budget:</strong> ${customOrder.budget || "Not specified"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Duration (hours) *
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              min="24"
              className="w-full border p-2 rounded"
              required
            />
            <p className="text-sm text-gray-600 mt-1">
              {Math.floor(formData.duration / 24)} days
            </p>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Minimum Bid Threshold ($)
            </label>
            <input
              type="number"
              value={formData.minBidThreshold}
              onChange={(e) =>
                setFormData({ ...formData, minBidThreshold: e.target.value })
              }
              className="w-full border p-2 rounded"
              placeholder="Optional"
              min="0"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.broadcastToAll}
                onChange={(e) =>
                  setFormData((prev) => {
                    const shouldBroadcast = e.target.checked;

                    if (shouldBroadcast) {
                      return {
                        ...prev,
                        broadcastToAll: true,
                      };
                    }

                    const withLinkedManufacturer = linkedManufacturerId
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
                      targetManufacturers: withLinkedManufacturer,
                    };
                  })
                }
              />
              <span className="font-semibold">
                Broadcast to all manufacturers
              </span>
            </label>

            {!formData.broadcastToAll && (
              <div className="mt-4 p-4 border rounded bg-gray-50 space-y-4">
                <div>
                  <label className="block mb-2 font-semibold">
                    Target manufacturers (multi-select)
                  </label>
                  <input
                    type="text"
                    value={manufacturerSearch}
                    onChange={(e) => setManufacturerSearch(e.target.value)}
                    placeholder="Search verified manufacturers by name"
                    className="w-full border p-2 rounded"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Only active verified manufacturers can be targeted.
                  </p>
                </div>

                {linkedManufacturerId && (
                  <div className="text-sm text-gray-700">
                    Linked manufacturer is auto-included and cannot be removed:{" "}
                    <span className="font-semibold">
                      {linkedManufacturerName}
                    </span>
                  </div>
                )}

                <div className="text-sm text-gray-700">
                  Selected:{" "}
                  <span className="font-semibold">
                    {selectedManufacturers.length}
                  </span>
                </div>

                <div className="max-h-56 overflow-auto border rounded bg-white divide-y">
                  {manufacturersLoading ? (
                    <p className="p-3 text-sm text-gray-600">
                      Loading manufacturers...
                    </p>
                  ) : availableManufacturers.length === 0 ? (
                    <p className="p-3 text-sm text-gray-600">
                      No verified manufacturers found for this search.
                    </p>
                  ) : (
                    availableManufacturers.map((manufacturer) => {
                      const manufacturerId = String(manufacturer._id);
                      const isLinkedLocked =
                        linkedManufacturerId &&
                        manufacturerId === String(linkedManufacturerId);
                      const checked =
                        formData.targetManufacturers.includes(manufacturerId);

                      return (
                        <label
                          key={manufacturerId}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isLinkedLocked}
                            onChange={() =>
                              handleToggleManufacturer(manufacturerId)
                            }
                            className="mt-1"
                          />
                          <span className="flex-1">
                            <span className="font-medium block">
                              {manufacturer.businessName || manufacturer.name}
                            </span>
                            <span className="text-xs text-gray-600">
                              {isLinkedLocked
                                ? "Linked manufacturer (required)"
                                : "Verified manufacturer"}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Creating..." : "Create RFQ"}
          </button>
        </form>
      </div>
    </div>
  );
}
