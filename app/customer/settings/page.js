// app/customer/settings/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import StripePaymentMethodsTab from "@/components/settings/StripePaymentMethodsTab";

function Label({ children }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full px-4 py-2.5 text-sm bg-white/[0.04] border border-white/8 rounded-xl text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors ${className}`}
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full px-4 py-2.5 text-sm bg-white/[0.04] border border-white/8 rounded-xl text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors resize-none ${className}`}
      {...props}
    />
  );
}

function SaveButton({ loading, saved, children = "Save Changes" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
        saved
          ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default"
          : loading
            ? "bg-[#eb9728]/40 border border-[#eb9728]/20 text-[#eb9728]/60 cursor-not-allowed"
            : "bg-[#eb9728] text-black hover:bg-[#d4871f]"
      }`}
    >
      {saved ? (
        <>
          <span className="material-symbols-outlined text-base">check</span>
          Saved!
        </>
      ) : loading ? (
        <>
          <span className="w-4 h-4 border-2 border-[#eb9728]/30 border-t-[#eb9728] rounded-full animate-spin" />
          Saving…
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Alert({ type = "error", message }) {
  if (!message) return null;
  return (
    <div
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${
        type === "error"
          ? "bg-red-500/10 border border-red-500/20 text-red-400"
          : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
      }`}
    >
      <span className="material-symbols-outlined text-base shrink-0">
        {type === "error" ? "error" : "check_circle"}
      </span>
      {message}
    </div>
  );
}

function Section({ title, desc, children }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
      {(title || desc) && (
        <div className="px-6 py-5 border-b border-white/8">
          {title && <h3 className="text-base font-bold text-white">{title}</h3>}
          {desc && <p className="text-sm text-white/35 mt-0.5">{desc}</p>}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab({ user, onRefresh }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    bio: "",
    address: { street: "", city: "", state: "", country: "", postalCode: "" },
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      bio: user.bio || "",
      address: {
        street: user.address?.street || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        country: user.address?.country || "",
        postalCode: user.address?.postalCode || "",
      },
    });
  }, [user]);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const setAddr = (field, val) =>
    setForm((f) => ({ ...f, address: { ...f.address, [field]: val } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          bio: form.bio.trim(),
          address: form.address,
        }),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || data.message || "Update failed");
      setSaved(true);
      onRefresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert type="error" message={error} />

      {/* Avatar preview */}
      <Section
        title="Profile Picture"
        desc="Your avatar uses your name initial for now."
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#eb9728] flex items-center justify-center text-black font-extrabold text-xl shrink-0">
            {form.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "U"}
          </div>
          <div>
            <p className="text-sm font-semibold text-white/85">
              {form.name || "Your Name"}
            </p>
            <p className="text-xs text-white/35">{user?.email}</p>
            <p className="text-xs text-white/25 mt-1">
              Profile photo upload coming soon.
            </p>
          </div>
        </div>
      </Section>

      {/* Basic info */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="opacity-40 cursor-not-allowed"
            />
            <p className="text-[10px] text-white/25 mt-1">
              Email cannot be changed.
            </p>
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </div>
          <div>
            <Label>Account Type</Label>
            <Input
              value="Customer"
              disabled
              className="opacity-40 cursor-not-allowed capitalize"
            />
          </div>
        </div>
        <div className="mt-4">
          <Label>Bio</Label>
          <Textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            placeholder="A short description about yourself or your company…"
          />
        </div>
      </Section>

      {/* Address */}
      <Section
        title="Shipping Address"
        desc="Default address used for orders and deliveries."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Street Address</Label>
            <Input
              value={form.address.street}
              onChange={(e) => setAddr("street", e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={form.address.city}
              onChange={(e) => setAddr("city", e.target.value)}
              placeholder="New York"
            />
          </div>
          <div>
            <Label>State / Province</Label>
            <Input
              value={form.address.state}
              onChange={(e) => setAddr("state", e.target.value)}
              placeholder="NY"
            />
          </div>
          <div>
            <Label>Country</Label>
            <Input
              value={form.address.country}
              onChange={(e) => setAddr("country", e.target.value)}
              placeholder="United States"
            />
          </div>
          <div>
            <Label>Postal Code</Label>
            <Input
              value={form.address.postalCode}
              onChange={(e) => setAddr("postalCode", e.target.value)}
              placeholder="10001"
            />
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton loading={loading} saved={saved} />
      </div>
    </form>
  );
}

// ─── PAYMENT METHODS TAB ─────────────────────────────────────────────────────
function PaymentMethodsTab({ user }) {
  return <StripePaymentMethodsTab user={user} />;
}

// ─── SECURITY TAB ─────────────────────────────────────────────────────────────
function SecurityTab({ user }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorSuccess, setTwoFactorSuccess] = useState("");

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  useEffect(() => {
    let active = true;

    async function loadTwoFactorSettings() {
      setTwoFactorLoading(true);
      setTwoFactorError("");
      try {
        const res = await fetch("/api/auth/2fa/settings");
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load 2FA settings");
        }
        if (active) setTwoFactorEnabled(!!data.twoFactorEnabled);
      } catch (err) {
        if (active)
          setTwoFactorError(err.message || "Failed to load 2FA settings");
      } finally {
        if (active) setTwoFactorLoading(false);
      }
    }

    loadTwoFactorSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleTwoFactorToggle = async () => {
    setTwoFactorSaving(true);
    setTwoFactorError("");
    setTwoFactorSuccess("");
    try {
      const res = await fetch("/api/auth/2fa/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !twoFactorEnabled }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to update 2FA settings");
      setTwoFactorEnabled(!!data.twoFactorEnabled);
      setTwoFactorSuccess(
        data.message ||
          (data.twoFactorEnabled ? "2FA enabled" : "2FA disabled"),
      );
    } catch (err) {
      setTwoFactorError(err.message || "Failed to update 2FA settings");
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || data.message || "Password update failed");
      setSaved(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Change password */}
      <Section
        title="Change Password"
        desc="Use a strong password with at least 8 characters."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert type="error" message={error} />
          {saved && (
            <Alert type="success" message="Password updated successfully." />
          )}
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => set("currentPassword", e.target.value)}
              placeholder="Your current password"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => set("newPassword", e.target.value)}
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              placeholder="Repeat new password"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end pt-1">
            <SaveButton loading={loading} saved={saved}>
              Update Password
            </SaveButton>
          </div>
        </form>
      </Section>

      {/* 2FA */}
      <Section
        title="Two-Factor Authentication"
        desc="Add an email code challenge each time you sign in."
      >
        <div className="space-y-4">
          <Alert type="error" message={twoFactorError} />
          {twoFactorSuccess && (
            <Alert type="success" message={twoFactorSuccess} />
          )}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/85">
                Email-based 2FA
              </p>
              <p className="text-xs text-white/35 mt-0.5">
                A 6-digit code will be sent to {user?.email} during login.
              </p>
            </div>
            <button
              type="button"
              disabled={twoFactorLoading || twoFactorSaving}
              onClick={handleTwoFactorToggle}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                twoFactorEnabled
                  ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                  : "bg-[#eb9728] text-black hover:bg-[#d4871f]"
              } ${twoFactorLoading || twoFactorSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {twoFactorLoading
                ? <GlobalLoader text="Loading..." /> : twoFactorSaving
                  ? "Saving..."
                  : twoFactorEnabled
                    ? "Disable 2FA"
                    : "Enable 2FA"}
            </button>
          </div>
          <p className="text-[11px] text-white/25">
            Verification codes expire after 10 minutes.
          </p>
        </div>
      </Section>

      {/* Account details */}
      <Section title="Account Details">
        <div className="space-y-0 divide-y divide-white/5">
          {[
            { label: "Email", value: user?.email },
            {
              label: "Account Status",
              value: (
                <span
                  className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                    user?.isActive
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}
                >
                  {user?.isActive ? "Active" : "Inactive"}
                </span>
              ),
            },
            {
              label: "Member Since",
              value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "—",
            },
            {
              label: "Last Active",
              value: user?.lastActive
                ? new Date(user.lastActive).toLocaleDateString()
                : "—",
            },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <span className="text-sm text-white/40">{row.label}</span>
              {typeof row.value === "string" ? (
                <span className="text-sm font-semibold text-white/80">
                  {row.value}
                </span>
              ) : (
                row.value
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/85">
              Deactivate Account
            </p>
            <p className="text-xs text-white/35 mt-0.5">
              Temporarily disable your account. You can reactivate at any time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => alert("Contact support to deactivate your account.")}
            className="px-4 py-2 text-sm font-bold text-red-400 border border-red-500/20 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all"
          >
            Deactivate
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── NOTIFICATIONS TAB ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    orderUpdates: true,
    rfqBids: true,
    groupBuys: true,
    marketing: false,
  });

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items = [
    {
      key: "orderUpdates",
      label: "Order Updates",
      desc: "Status changes, shipping, delivery confirmations.",
    },
    {
      key: "rfqBids",
      label: "RFQ & Bids",
      desc: "New bids, bid updates, and awarded notifications.",
    },
    {
      key: "groupBuys",
      label: "Group Buys",
      desc: "Tier unlocks, campaign endings, and new group buys.",
    },
    {
      key: "marketing",
      label: "Promotions & News",
      desc: "Product announcements, special offers, and Craftit updates.",
    },
  ];

  return (
    <div className="space-y-4">
      <Section
        title="Email Notifications"
        desc="Choose what emails you receive from Craftit."
      >
        <div className="divide-y divide-white/5">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-4 last:pb-0 first:pt-0"
            >
              <div>
                <p className="text-sm font-semibold text-white/85">
                  {item.label}
                </p>
                <p className="text-xs text-white/35 mt-0.5">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4 ${
                  prefs[item.key] ? "bg-[#eb9728]" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    prefs[item.key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <div className="rounded-2xl border border-[#eb9728]/20 bg-[#eb9728]/5 px-5 py-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-[#eb9728] text-lg shrink-0 mt-0.5">
          info
        </span>
        <p className="text-sm text-[#eb9728]/80">
          Notification preferences will be saved in a future update. Changes
          here are previewed only.
        </p>
      </div>
    </div>
  );
}

function CustomerSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.success)
        throw new Error(data.message || "Failed to load profile");
      setUser(data.user);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
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
      fetchUser();
    }
  }, [status, session, router, fetchUser]);

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading settings..." />;
  }

  const tabs = [
    { key: "profile", label: "Profile", icon: "manage_accounts" },
    { key: "payment", label: "Payment Methods", icon: "credit_card" },
    { key: "security", label: "Security", icon: "lock" },
    { key: "notifications", label: "Notifications", icon: "notifications" },
  ];

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 sm:px-8 bg-[#050507]/80 backdrop-blur-sm border-b border-white/8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-[#eb9728] transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Back
          </button>
          <span className="text-white/15">|</span>
          <h1 className="text-sm font-bold text-white/70">Settings</h1>
        </div>
        <div className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-black font-bold text-sm shrink-0">
          {initials}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {fetchError && <Alert type="error" message={fetchError} />}

        {/* Page title */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
            Account
          </p>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Settings
          </h2>
          <p className="text-sm text-white/35 mt-1">
            Manage your profile, security, and preferences.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-[#eb9728] text-black"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "profile" && (
          <ProfileTab user={user} onRefresh={fetchUser} />
        )}
        {activeTab === "payment" && <PaymentMethodsTab user={user} />}
        {activeTab === "security" && <SecurityTab user={user} />}
        {activeTab === "notifications" && <NotificationsTab />}
      </main>
    </div>
  );
}

export default function CustomerSettingsPage() {
  return (
    <Suspense
      fallback={
        <GlobalLoader fullScreen text="Loading ..." />
      }
    >
      <CustomerSettingsPageContent />
    </Suspense>
  );
}
// // app/customer/settings/page.js
// "use client";

// import { Suspense, useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useSession } from "next-auth/react";
// import StripePaymentMethodsTab from "@/components/settings/StripePaymentMethodsTab";

// function Label({ children }) {
//   return (
//     <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
//       {children}
//     </label>
//   );
// }

// function Input({ className = "", ...props }) {
//   return (
//     <input
//       className={`w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#eb9728]/40 focus:border-[#eb9728] transition-colors ${className}`}
//       {...props}
//     />
//   );
// }

// function Textarea({ className = "", ...props }) {
//   return (
//     <textarea
//       className={`w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#eb9728]/40 focus:border-[#eb9728] transition-colors resize-none ${className}`}
//       {...props}
//     />
//   );
// }

// function SaveButton({ loading, saved, children = "Save Changes" }) {
//   return (
//     <button
//       type="submit"
//       disabled={loading}
//       className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
//         saved
//           ? "bg-green-500 cursor-default"
//           : loading
//             ? "bg-[#eb9728]/70 cursor-not-allowed"
//             : "bg-[#eb9728] hover:bg-amber-600 shadow-sm hover:shadow"
//       }`}
//     >
//       {saved ? (
//         <>
//           <span className="material-symbols-outlined text-base">check</span>
//           Saved!
//         </>
//       ) : loading ? (
//         <>
//           <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
//           Saving…
//         </>
//       ) : (
//         children
//       )}
//     </button>
//   );
// }

// function Alert({ type = "error", message }) {
//   if (!message) return null;
//   return (
//     <div
//       className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}
//     >
//       <span className="material-symbols-outlined text-base shrink-0">
//         {type === "error" ? "error" : "check_circle"}
//       </span>
//       {message}
//     </div>
//   );
// }

// function Section({ title, desc, children }) {
//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
//       {(title || desc) && (
//         <div className="mb-5 pb-5 border-b border-gray-100">
//           {title && (
//             <h3 className="text-base font-bold text-gray-900">{title}</h3>
//           )}
//           {desc && <p className="text-sm text-gray-400 mt-0.5">{desc}</p>}
//         </div>
//       )}
//       {children}
//     </div>
//   );
// }

// // ─── PROFILE TAB ─────────────────────────────────────────────────────────────
// function ProfileTab({ user, onRefresh }) {
//   const [form, setForm] = useState({
//     name: "",
//     phone: "",
//     bio: "",
//     address: { street: "", city: "", state: "", country: "", postalCode: "" },
//   });
//   const [loading, setLoading] = useState(false);
//   const [saved, setSaved] = useState(false);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (!user) return;
//     setForm({
//       name: user.name || "",
//       phone: user.phone || "",
//       bio: user.bio || "",
//       address: {
//         street: user.address?.street || "",
//         city: user.address?.city || "",
//         state: user.address?.state || "",
//         country: user.address?.country || "",
//         postalCode: user.address?.postalCode || "",
//       },
//     });
//   }, [user]);

//   const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
//   const setAddr = (field, val) =>
//     setForm((f) => ({ ...f, address: { ...f.address, [field]: val } }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");
//     setSaved(false);
//     try {
//       const res = await fetch(`/api/users/${user._id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           name: form.name.trim(),
//           phone: form.phone.trim(),
//           bio: form.bio.trim(),
//           address: form.address,
//         }),
//       });
//       const data = await res.json();
//       if (!data.success)
//         throw new Error(data.error || data.message || "Update failed");
//       setSaved(true);
//       onRefresh();
//       setTimeout(() => setSaved(false), 3000);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-5">
//       <Alert type="error" message={error} />

//       {/* Avatar preview */}
//       <Section
//         title="Profile Picture"
//         desc="Your avatar uses your name initial for now."
//       >
//         <div className="flex items-center gap-5">
//           <div className="w-16 h-16 rounded-full bg-[#eb9728] flex items-center justify-center text-white font-extrabold text-xl shrink-0">
//             {form.name
//               ?.split(" ")
//               .map((n) => n[0])
//               .join("")
//               .slice(0, 2)
//               .toUpperCase() || "U"}
//           </div>
//           <div>
//             <p className="text-sm font-semibold text-gray-900">
//               {form.name || "Your Name"}
//             </p>
//             <p className="text-xs text-gray-400">{user?.email}</p>
//             <p className="text-xs text-gray-400 mt-1">
//               Profile photo upload coming soon.
//             </p>
//           </div>
//         </div>
//       </Section>

//       {/* Basic info */}
//       <Section title="Basic Information">
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div>
//             <Label>Full Name</Label>
//             <Input
//               value={form.name}
//               onChange={(e) => set("name", e.target.value)}
//               placeholder="Your full name"
//               required
//             />
//           </div>
//           <div>
//             <Label>Email Address</Label>
//             <Input
//               value={user?.email || ""}
//               disabled
//               className="bg-gray-50 text-gray-400 cursor-not-allowed"
//             />
//             <p className="text-[10px] text-gray-400 mt-1">
//               Email cannot be changed.
//             </p>
//           </div>
//           <div>
//             <Label>Phone Number</Label>
//             <Input
//               value={form.phone}
//               onChange={(e) => set("phone", e.target.value)}
//               placeholder="+1 (555) 000-0000"
//               type="tel"
//             />
//           </div>
//           <div>
//             <Label>Account Type</Label>
//             <Input
//               value="Customer"
//               disabled
//               className="bg-gray-50 text-gray-400 cursor-not-allowed capitalize"
//             />
//           </div>
//         </div>
//         <div className="mt-4">
//           <Label>Bio</Label>
//           <Textarea
//             value={form.bio}
//             onChange={(e) => set("bio", e.target.value)}
//             rows={3}
//             placeholder="A short description about yourself or your company…"
//           />
//         </div>
//       </Section>

//       {/* Address */}
//       <Section
//         title="Shipping Address"
//         desc="Default address used for orders and deliveries."
//       >
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div className="sm:col-span-2">
//             <Label>Street Address</Label>
//             <Input
//               value={form.address.street}
//               onChange={(e) => setAddr("street", e.target.value)}
//               placeholder="123 Main St"
//             />
//           </div>
//           <div>
//             <Label>City</Label>
//             <Input
//               value={form.address.city}
//               onChange={(e) => setAddr("city", e.target.value)}
//               placeholder="New York"
//             />
//           </div>
//           <div>
//             <Label>State / Province</Label>
//             <Input
//               value={form.address.state}
//               onChange={(e) => setAddr("state", e.target.value)}
//               placeholder="NY"
//             />
//           </div>
//           <div>
//             <Label>Country</Label>
//             <Input
//               value={form.address.country}
//               onChange={(e) => setAddr("country", e.target.value)}
//               placeholder="United States"
//             />
//           </div>
//           <div>
//             <Label>Postal Code</Label>
//             <Input
//               value={form.address.postalCode}
//               onChange={(e) => setAddr("postalCode", e.target.value)}
//               placeholder="10001"
//             />
//           </div>
//         </div>
//       </Section>

//       <div className="flex justify-end">
//         <SaveButton loading={loading} saved={saved} />
//       </div>
//     </form>
//   );
// }

// // ─── PAYMENT METHODS TAB ─────────────────────────────────────────────────────
// function PaymentMethodsTab({ user }) {
//   return <StripePaymentMethodsTab user={user} />;
// }

// // ─── SECURITY TAB ─────────────────────────────────────────────────────────────
// function SecurityTab({ user }) {
//   const [form, setForm] = useState({
//     currentPassword: "",
//     newPassword: "",
//     confirmPassword: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [saved, setSaved] = useState(false);
//   const [error, setError] = useState("");
//   const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
//   const [twoFactorLoading, setTwoFactorLoading] = useState(true);
//   const [twoFactorSaving, setTwoFactorSaving] = useState(false);
//   const [twoFactorError, setTwoFactorError] = useState("");
//   const [twoFactorSuccess, setTwoFactorSuccess] = useState("");

//   const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

//   useEffect(() => {
//     let active = true;

//     async function loadTwoFactorSettings() {
//       setTwoFactorLoading(true);
//       setTwoFactorError("");

//       try {
//         const res = await fetch("/api/auth/2fa/settings");
//         const data = await res.json();

//         if (!res.ok || !data.success) {
//           throw new Error(data.message || "Failed to load 2FA settings");
//         }

//         if (active) {
//           setTwoFactorEnabled(!!data.twoFactorEnabled);
//         }
//       } catch (err) {
//         if (active) {
//           setTwoFactorError(err.message || "Failed to load 2FA settings");
//         }
//       } finally {
//         if (active) {
//           setTwoFactorLoading(false);
//         }
//       }
//     }

//     loadTwoFactorSettings();

//     return () => {
//       active = false;
//     };
//   }, []);

//   const handleTwoFactorToggle = async () => {
//     setTwoFactorSaving(true);
//     setTwoFactorError("");
//     setTwoFactorSuccess("");

//     try {
//       const res = await fetch("/api/auth/2fa/settings", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ enabled: !twoFactorEnabled }),
//       });

//       const data = await res.json();

//       if (!res.ok || !data.success) {
//         throw new Error(data.message || "Failed to update 2FA settings");
//       }

//       setTwoFactorEnabled(!!data.twoFactorEnabled);
//       setTwoFactorSuccess(
//         data.message ||
//           (data.twoFactorEnabled ? "2FA enabled" : "2FA disabled"),
//       );
//     } catch (err) {
//       setTwoFactorError(err.message || "Failed to update 2FA settings");
//     } finally {
//       setTwoFactorSaving(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     if (form.newPassword.length < 8) {
//       setError("New password must be at least 8 characters.");
//       return;
//     }
//     if (form.newPassword !== form.confirmPassword) {
//       setError("Passwords do not match.");
//       return;
//     }
//     setLoading(true);
//     try {
//       const res = await fetch("/api/auth/change-password", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           currentPassword: form.currentPassword,
//           newPassword: form.newPassword,
//         }),
//       });
//       const data = await res.json();
//       if (!data.success)
//         throw new Error(data.error || data.message || "Password update failed");
//       setSaved(true);
//       setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
//       setTimeout(() => setSaved(false), 3000);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-5">
//       {/* Change password */}
//       <Section
//         title="Change Password"
//         desc="Use a strong password with at least 8 characters."
//       >
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <Alert type="error" message={error} />
//           {saved && (
//             <Alert type="success" message="Password updated successfully." />
//           )}
//           <div>
//             <Label>Current Password</Label>
//             <Input
//               type="password"
//               value={form.currentPassword}
//               onChange={(e) => set("currentPassword", e.target.value)}
//               placeholder="Your current password"
//               required
//               autoComplete="current-password"
//             />
//           </div>
//           <div>
//             <Label>New Password</Label>
//             <Input
//               type="password"
//               value={form.newPassword}
//               onChange={(e) => set("newPassword", e.target.value)}
//               placeholder="At least 8 characters"
//               required
//               autoComplete="new-password"
//             />
//           </div>
//           <div>
//             <Label>Confirm New Password</Label>
//             <Input
//               type="password"
//               value={form.confirmPassword}
//               onChange={(e) => set("confirmPassword", e.target.value)}
//               placeholder="Repeat new password"
//               required
//               autoComplete="new-password"
//             />
//           </div>
//           <div className="flex justify-end pt-1">
//             <SaveButton loading={loading} saved={saved}>
//               Update Password
//             </SaveButton>
//           </div>
//         </form>
//       </Section>

//       {/* Account info */}
//       <Section
//         title="Two-Factor Authentication"
//         desc="Add an email code challenge each time you sign in."
//       >
//         <Alert type="error" message={twoFactorError} />
//         {twoFactorSuccess && (
//           <Alert type="success" message={twoFactorSuccess} />
//         )}

//         <div className="flex items-center justify-between gap-4">
//           <div>
//             <p className="text-sm font-semibold text-gray-900">
//               Email-based 2FA
//             </p>
//             <p className="text-xs text-gray-400 mt-0.5">
//               A 6-digit code will be sent to {user?.email} during login.
//             </p>
//           </div>
//           <button
//             type="button"
//             disabled={twoFactorLoading || twoFactorSaving}
//             onClick={handleTwoFactorToggle}
//             className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
//               twoFactorEnabled
//                 ? "text-red-600 border border-red-200 hover:bg-red-50"
//                 : "text-white bg-[#eb9728] hover:bg-amber-600"
//             } ${twoFactorLoading || twoFactorSaving ? "opacity-60 cursor-not-allowed" : ""}`}
//           >
//             {twoFactorLoading
//               ? "Loading..."
//               : twoFactorSaving
//                 ? "Saving..."
//                 : twoFactorEnabled
//                   ? "Disable 2FA"
//                   : "Enable 2FA"}
//           </button>
//         </div>

//         <p className="text-[11px] text-gray-400 mt-3">
//           Verification codes expire after 10 minutes.
//         </p>
//       </Section>

//       <Section title="Account Details">
//         <div className="space-y-3 text-sm">
//           <div className="flex items-center justify-between py-2 border-b border-gray-50">
//             <span className="text-gray-500">Email</span>
//             <span className="font-semibold text-gray-900">{user?.email}</span>
//           </div>
//           <div className="flex items-center justify-between py-2 border-b border-gray-50">
//             <span className="text-gray-500">Account Status</span>
//             <span
//               className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${user?.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
//             >
//               {user?.isActive ? "Active" : "Inactive"}
//             </span>
//           </div>
//           <div className="flex items-center justify-between py-2 border-b border-gray-50">
//             <span className="text-gray-500">Member Since</span>
//             <span className="font-semibold text-gray-900">
//               {user?.createdAt
//                 ? new Date(user.createdAt).toLocaleDateString("en-US", {
//                     month: "long",
//                     year: "numeric",
//                   })
//                 : "—"}
//             </span>
//           </div>
//           <div className="flex items-center justify-between py-2">
//             <span className="text-gray-500">Last Active</span>
//             <span className="font-semibold text-gray-900">
//               {user?.lastActive
//                 ? new Date(user.lastActive).toLocaleDateString()
//                 : "—"}
//             </span>
//           </div>
//         </div>
//       </Section>

//       {/* Danger zone */}
//       <Section title="Danger Zone">
//         <div className="flex items-center justify-between">
//           <div>
//             <p className="text-sm font-semibold text-gray-900">
//               Deactivate Account
//             </p>
//             <p className="text-xs text-gray-400 mt-0.5">
//               Temporarily disable your account. You can reactivate at any time.
//             </p>
//           </div>
//           <button
//             type="button"
//             onClick={() => alert("Contact support to deactivate your account.")}
//             className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
//           >
//             Deactivate
//           </button>
//         </div>
//       </Section>
//     </div>
//   );
// }

// // ─── NOTIFICATIONS TAB (UI only — Phase 10) ───────────────────────────────────
// function NotificationsTab() {
//   const [prefs, setPrefs] = useState({
//     orderUpdates: true,
//     rfqBids: true,
//     groupBuys: true,
//     marketing: false,
//   });

//   const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

//   const items = [
//     {
//       key: "orderUpdates",
//       label: "Order Updates",
//       desc: "Status changes, shipping, delivery confirmations.",
//     },
//     {
//       key: "rfqBids",
//       label: "RFQ & Bids",
//       desc: "New bids, bid updates, and awarded notifications.",
//     },
//     {
//       key: "groupBuys",
//       label: "Group Buys",
//       desc: "Tier unlocks, campaign endings, and new group buys.",
//     },
//     {
//       key: "marketing",
//       label: "Promotions & News",
//       desc: "Product announcements, special offers, and Craftit updates.",
//     },
//   ];

//   return (
//     <div className="space-y-5">
//       <Section
//         title="Email Notifications"
//         desc="Choose what emails you receive from Craftit."
//       >
//         <div className="space-y-1">
//           {items.map((item) => (
//             <div
//               key={item.key}
//               className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0"
//             >
//               <div>
//                 <p className="text-sm font-semibold text-gray-900">
//                   {item.label}
//                 </p>
//                 <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => toggle(item.key)}
//                 className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4 ${prefs[item.key] ? "bg-[#eb9728]" : "bg-gray-200"}`}
//               >
//                 <span
//                   className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${prefs[item.key] ? "translate-x-5" : "translate-x-0"}`}
//                 />
//               </button>
//             </div>
//           ))}
//         </div>
//       </Section>

//       <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-start gap-3">
//         <span className="material-symbols-outlined text-amber-500 text-lg shrink-0 mt-0.5">
//           info
//         </span>
//         <p className="text-sm text-amber-700">
//           Notification preferences will be saved in a future update. Changes
//           here are previewed only.
//         </p>
//       </div>
//     </div>
//   );
// }

// function CustomerSettingsPageContent() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { data: session, status } = useSession();

//   const initialTab = searchParams.get("tab") || "profile";
//   const [activeTab, setActiveTab] = useState(initialTab);
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [fetchError, setFetchError] = useState("");

//   const fetchUser = useCallback(async () => {
//     try {
//       const res = await fetch("/api/auth/me");
//       const data = await res.json();
//       if (!data.success)
//         throw new Error(data.message || "Failed to load profile");
//       setUser(data.user);
//     } catch (err) {
//       setFetchError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/auth/login");
//       return;
//     }
//     if (status === "authenticated") {
//       if (session.user.role !== "customer") {
//         router.push("/auth/login");
//         return;
//       }
//       fetchUser();
//     }
//   }, [status, session, router, fetchUser]);

//   if (status === "loading" || loading) {
//     return (
//       <div className="flex h-screen bg-[#f8f7f6]">
//         <main className="flex-1 flex items-center justify-center">
//           <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
//         </main>
//       </div>
//     );
//   }

//   const tabs = [
//     { key: "profile", label: "Profile", icon: "manage_accounts" },
//     { key: "payment", label: "Payment Methods", icon: "credit_card" },
//     { key: "security", label: "Security", icon: "lock" },
//     { key: "notifications", label: "Notifications", icon: "notifications" },
//   ];

//   const initials =
//     user?.name
//       ?.split(" ")
//       .map((n) => n[0])
//       .join("")
//       .slice(0, 2)
//       .toUpperCase() || "U";

//   return (
//     <div className="flex h-screen bg-[#f8f7f6]">
//       <main className="flex-1 overflow-y-auto">
//         {/* Header */}
//         <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200">
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => router.back()}
//               className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#eb9728] transition-colors"
//             >
//               <span className="material-symbols-outlined text-base">
//                 arrow_back
//               </span>
//               Back
//             </button>
//             <span className="text-gray-300">|</span>
//             <h1 className="text-base font-bold text-gray-900">Settings</h1>
//           </div>
//           <div className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-bold text-sm">
//             {initials}
//           </div>
//         </header>

//         <div className="p-8 max-w-4xl mx-auto">
//           {fetchError && (
//             <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
//               {fetchError}
//             </div>
//           )}

//           {/* Page title */}
//           <div className="mb-6">
//             <h2 className="text-2xl font-extrabold text-gray-900">
//               Account Settings
//             </h2>
//             <p className="text-sm text-gray-400 mt-1">
//               Manage your profile, security, and preferences.
//             </p>
//           </div>

//           {/* Tabs */}
//           <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm mb-6 w-fit">
//             {tabs.map((tab) => (
//               <button
//                 key={tab.key}
//                 onClick={() => setActiveTab(tab.key)}
//                 className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
//                   activeTab === tab.key
//                     ? "bg-[#eb9728] text-white shadow-sm"
//                     : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
//                 }`}
//               >
//                 <span className="material-symbols-outlined text-base">
//                   {tab.icon}
//                 </span>
//                 {tab.label}
//               </button>
//             ))}
//           </div>

//           {/* Tab content */}
//           {activeTab === "profile" && (
//             <ProfileTab user={user} onRefresh={fetchUser} />
//           )}
//           {activeTab === "payment" && <PaymentMethodsTab user={user} />}
//           {activeTab === "security" && <SecurityTab user={user} />}
//           {activeTab === "notifications" && <NotificationsTab />}
//         </div>
//       </main>
//     </div>
//   );
// }

// export default function CustomerSettingsPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="flex h-screen bg-[#f8f7f6] items-center justify-center">
//           <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
//         </div>
//       }
//     >
//       <CustomerSettingsPageContent />
//     </Suspense>
//   );
// }
