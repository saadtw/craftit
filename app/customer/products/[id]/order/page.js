"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import CustomerSidebar from "@/components/CustomerSidebar";
import LogoutButton from "@/components/LogoutButton";

export default function PlaceProductOrderPage() {
  const { id } = useParams(); // product id
  const router = useRouter();
  const { data: session, status } = useSession();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    quantity: "",
    specialRequirements: "",
    paymentMethod: "card",
    // Delivery address
    street: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    recipientName: "",
    recipientPhone: "",
    // Saved address selector
    selectedSavedAddress: "",
  });

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}/public`);
      const data = await res.json();
      if (data.success) {
        setProduct(data.product);
        setForm((f) => ({ ...f, quantity: String(data.product.moq) }));
      } else {
        router.push("/customer/explore");
      }
    } catch (err) {
      router.push("/customer/explore");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

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
      fetchProduct();
    }
  }, [status, session, router, fetchProduct]);

  const handleSavedAddressSelect = (e) => {
    const addressId = e.target.value;
    setForm((f) => ({ ...f, selectedSavedAddress: addressId }));

    if (!addressId) return;
    const saved = session?.user?.savedAddresses?.find(
      (a) => a._id === addressId,
    );
    if (saved) {
      setForm((f) => ({
        ...f,
        selectedSavedAddress: addressId,
        recipientName: saved.name || "",
        recipientPhone: saved.phone || "",
        street: saved.street || "",
        city: saved.city || "",
        state: saved.state || "",
        country: saved.country || "",
        postalCode: saved.postalCode || "",
      }));
    }
  };

  const handleSubmit = async () => {
    setError("");

    const qty = parseInt(form.quantity);
    if (!qty || qty < 1) {
      setError("Please enter a valid quantity.");
      return;
    }
    if (product?.moq && qty < product.moq) {
      setError(`Minimum order quantity is ${product.moq} units.`);
      return;
    }
    if (!form.street || !form.city || !form.country) {
      setError(
        "Please fill in the delivery address (street, city, country are required).",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          quantity: qty,
          paymentMethod: form.paymentMethod,
          specialRequirements: form.specialRequirements,
          deliveryAddress: {
            recipientName: form.recipientName,
            recipientPhone: form.recipientPhone,
            street: form.street,
            city: form.city,
            state: form.state,
            country: form.country,
            postalCode: form.postalCode,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/customer/orders/${data.order._id}?placed=true`);
      } else {
        setError(data.error || "Failed to place order. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!product) return null;

  const qty = parseInt(form.quantity) || 0;
  const unitPrice = product.price || 0;
  const totalPrice = qty * unitPrice;
  const primaryImage =
    product.images?.find((i) => i.isPrimary) || product.images?.[0];
  const savedAddresses = session?.user?.savedAddresses || [];

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      <CustomerSidebar active="explore" session={session} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Link
              href={`/customer/products/${id}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#eb9728]"
            >
              <span className="material-symbols-outlined text-base">
                arrow_back
              </span>
              Back to Product
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-900">
              Place Order
            </span>
          </div>
          <div className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Place Order</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left: Form ── */}
            <div className="lg:col-span-2 space-y-5">
              {/* Quantity */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                  Order Quantity
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Quantity (units)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            quantity: String(
                              Math.max(
                                product.moq,
                                parseInt(f.quantity || 0) - 1,
                              ),
                            ),
                          }))
                        }
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 flex items-center justify-center"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={form.quantity}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, quantity: e.target.value }))
                        }
                        min={product.moq}
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:border-[#eb9728]"
                      />
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            quantity: String(parseInt(f.quantity || 0) + 1),
                          }))
                        }
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Minimum order quantity: {product.moq} units
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                  Delivery Address
                </h2>

                {/* Saved address selector */}
                {savedAddresses.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Use a saved address
                    </label>
                    <select
                      value={form.selectedSavedAddress}
                      onChange={handleSavedAddressSelect}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#eb9728]"
                    >
                      <option value="">— Enter manually —</option>
                      {savedAddresses.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.label || a.name} — {a.city}, {a.country}
                          {a.isDefault ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    label="Recipient Name"
                    value={form.recipientName}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, recipientName: v }))
                    }
                    placeholder="Full name"
                  />
                  <FormField
                    label="Phone"
                    value={form.recipientPhone}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, recipientPhone: v }))
                    }
                    placeholder="+1 234 567 8900"
                  />
                  <div className="sm:col-span-2">
                    <FormField
                      label="Street Address *"
                      value={form.street}
                      onChange={(v) => setForm((f) => ({ ...f, street: v }))}
                      placeholder="123 Main St, Suite 4"
                      required
                    />
                  </div>
                  <FormField
                    label="City *"
                    value={form.city}
                    onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                    placeholder="New York"
                    required
                  />
                  <FormField
                    label="State / Province"
                    value={form.state}
                    onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                    placeholder="NY"
                  />
                  <FormField
                    label="Country *"
                    value={form.country}
                    onChange={(v) => setForm((f) => ({ ...f, country: v }))}
                    placeholder="United States"
                    required
                  />
                  <FormField
                    label="Postal Code"
                    value={form.postalCode}
                    onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))}
                    placeholder="10001"
                  />
                </div>
              </div>

              {/* Special requirements */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                  Special Requirements
                  <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
                    Optional
                  </span>
                </h2>
                <textarea
                  value={form.specialRequirements}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      specialRequirements: e.target.value,
                    }))
                  }
                  placeholder="Any custom specifications, packaging notes, or delivery instructions..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#eb9728] resize-none"
                />
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                  Payment Method
                </h2>
                <div className="flex gap-3">
                  {[
                    {
                      value: "card",
                      label: "Credit / Debit Card",
                      icon: "credit_card",
                    },
                    {
                      value: "bank_transfer",
                      label: "Bank Transfer",
                      icon: "account_balance",
                    },
                    { value: "escrow", label: "Escrow", icon: "security" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setForm((f) => ({ ...f, paymentMethod: opt.value }))
                      }
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        form.paymentMethod === opt.value
                          ? "border-[#eb9728] bg-[#eb9728]/5 text-[#eb9728]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {opt.icon}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="space-y-4">
              {/* Product card */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="h-36 bg-gray-100 overflow-hidden relative">
                  {primaryImage?.url ? (
                    <Image
                      src={primaryImage.url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-gray-300">
                        inventory_2
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {product.manufacturerId?.businessName ||
                      product.manufacturerId?.name}
                  </p>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Unit price</span>
                    <span>${unitPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Quantity</span>
                    <span>{qty || "—"} units</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-[#eb9728]">
                      {qty > 0 ? `$${totalPrice.toLocaleString()}` : "—"}
                    </span>
                  </div>
                </div>

                {product.leadTime && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 bg-amber-50 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-sm text-amber-500">
                      schedule
                    </span>
                    Estimated lead time: {product.leadTime} days
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !form.street ||
                    !form.city ||
                    !form.country ||
                    qty < (product.moq || 1)
                  }
                  className="w-full py-3 bg-[#eb9728] text-white font-semibold rounded-xl hover:bg-[#eb9728]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        shopping_cart_checkout
                      </span>
                      Confirm Order
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  The manufacturer must accept before production begins.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#eb9728]"
      />
    </div>
  );
}

function LegacyCustomerSidebar({ active, session }) {
  const navItems = [
    {
      href: "/customer/dashboard",
      icon: "home",
      label: "Dashboard",
      key: "dashboard",
    },
    {
      href: "/customer/explore",
      icon: "storefront",
      label: "Explore Products",
      key: "explore",
    },
    {
      href: "/customer/custom-orders",
      icon: "inventory_2",
      label: "My Custom Orders",
      key: "custom-orders",
    },
    { href: "/customer/rfqs", icon: "gavel", label: "My RFQs", key: "rfqs" },
    {
      href: "/customer/orders",
      icon: "receipt_long",
      label: "Orders History",
      key: "orders",
    },
    {
      href: "#",
      icon: "favorite",
      label: "Wishlist",
      key: "wishlist",
      disabled: true,
    },
    {
      href: "#",
      icon: "mail",
      label: "Messages",
      key: "messages",
      disabled: true,
    },
    {
      href: "#",
      icon: "payments",
      label: "Payments",
      key: "payments",
      disabled: true,
    },
    {
      href: "#",
      icon: "settings",
      label: "Settings",
      key: "settings",
      disabled: true,
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#f8f7f6] p-6 flex flex-col justify-between border-r border-gray-200">
      <div>
        <div className="mb-10">
          <svg
            className="h-8 w-8 text-amber-600"
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.177,14.686,21.5,4.2a3,3,0,0,1,3,0l17.323,10.485a3,3,0,0,1,1.5,2.6V30.714a3,3,0,0,1-1.5,2.6L24.5,43.8a3,3,0,0,1-3,0L4.177,33.314a3,3,0,0,1-1.5-2.6V17.286a3,3,0,0,1,1.5-2.6Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="m22.5,24,14.5-8.5M22.5,24V43.5M22.5,24,9,16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Craftit</h1>
        </div>
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                item.disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : active === item.key
                    ? "bg-[#eb9728]/20 text-[#eb9728]"
                    : "text-gray-700 hover:bg-[#eb9728]/10"
              }`}
              title={item.disabled ? "Coming soon" : undefined}
            >
              <span className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <LogoutButton />
    </aside>
  );
}
