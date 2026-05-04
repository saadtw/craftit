// app/manufacturer/settings/page.js
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import StripeConnectPayoutsTab from "@/components/settings/StripeConnectPayoutsTab";
import GlobalLoader from "@/components/ui/GlobalLoader";

// ─── Small helpers ────────────────────────────────────────────────────────────
function Label({ children, optional = false }) {
  return (
    <label className="block text-[10px] font-black text-white/20 uppercase tracking-[0.15em] mb-2 px-1">
      {children}
      {optional && (
        <span className="ml-2 text-white/10 normal-case font-bold tracking-normal italic">
          (optional)
        </span>
      )}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full px-5 py-3.5 text-sm bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all ${className}`}
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full px-5 py-3.5 text-sm bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all resize-none ${className}`}
      {...props}
    />
  );
}

function SaveButton({ loading, saved, children = "Save Changes" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg ${
        saved
          ? "bg-emerald-500/80 shadow-emerald-500/20"
          : loading
            ? "bg-purple-600/50 cursor-not-allowed"
            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20 active:scale-95"
      }`}
    >
      {saved ? (
        <>
          <span className="material-symbols-outlined text-sm font-black">
            check
          </span>
          Success!
        </>
      ) : loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Processing…
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-sm font-black">
            save
          </span>
          {children}
        </>
      )}
    </button>
  );
}

function Alert({ type = "error", message }) {
  if (!message) return null;
  return (
    <div
      className={`flex items-start gap-3 px-5 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${
        type === "error"
          ? "bg-red-500/10 text-red-400 border border-red-500/20"
          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      }`}
    >
      <span className="material-symbols-outlined text-base shrink-0">
        {type === "error" ? "error" : "check_circle"}
      </span>
      {message}
    </div>
  );
}

function Section({ title, desc, children, className = "" }) {
  return (
    <div
      className={`bg-white/[0.03] border-2 border-purple-500/30 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-500 ${className}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] pointer-events-none group-hover:bg-purple-500/10 transition-all duration-700" />
      {(title || desc) && (
        <div className="mb-8 relative z-10">
          {title && (
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
              {title}
            </h3>
          )}
          {desc && <p className="text-sm text-white/40 font-medium">{desc}</p>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Capability / material multi-select chips ────────────────────────────────
const ALL_CAPABILITIES = [
  "CNC_Machining",
  "3D_Printing",
  "Injection_Molding",
  "Sheet_Metal",
  "Casting",
  "Welding",
  "Assembly",
  "Finishing",
  "Prototyping",
  "Mass_Production",
];

const ALL_MATERIALS = [
  "Steel",
  "Aluminum",
  "Plastic",
  "Copper",
  "Brass",
  "Wood",
  "Carbon_Fiber",
  "Titanium",
  "Rubber",
  "Glass",
];

function ChipSelector({ options, selected, onChange }) {
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              active
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/20 shadow-lg shadow-purple-500/10"
                : "bg-white/5 text-white/30 border-white/5 hover:border-white/20 hover:text-white/60"
            }`}
          >
            {opt.replace(/_/g, " ")}
          </button>
        );
      })}
    </div>
  );
}

// ─── Image upload helper ──────────────────────────────────────────────────────
async function uploadFile(file, fileType = "image") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", fileType);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Upload failed");
  return data.file?.url;
}

// ─── BUSINESS PROFILE TAB ────────────────────────────────────────────────────
function BusinessProfileTab({ user, onRefresh }) {
  const [form, setForm] = useState({
    businessName: "",
    businessDescription: "",
    phone: "",
    minOrderQuantity: "",
    businessAddress: {
      street: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
    manufacturingCapabilities: [],
    materialsAvailable: [],
    budgetRange: { min: "", max: "" },
    certifications: "",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      businessName: user.businessName || "",
      businessDescription: user.businessDescription || "",
      phone: user.phone || "",
      minOrderQuantity: user.minOrderQuantity || "",
      businessAddress: {
        street: user.businessAddress?.street || "",
        city: user.businessAddress?.city || "",
        state: user.businessAddress?.state || "",
        country: user.businessAddress?.country || "",
        postalCode: user.businessAddress?.postalCode || "",
      },
      manufacturingCapabilities: user.manufacturingCapabilities || [],
      materialsAvailable: user.materialsAvailable || [],
      budgetRange: {
        min: user.budgetRange?.min || "",
        max: user.budgetRange?.max || "",
      },
      certifications: (user.certifications || []).join(", "),
    });
    setLogoUrl(user.businessLogo || "");
    setBannerUrl(user.businessBanner || "");
  }, [user]);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const setAddr = (field, val) =>
    setForm((f) => ({
      ...f,
      businessAddress: { ...f.businessAddress, [field]: val },
    }));
  const setBudget = (field, val) =>
    setForm((f) => ({ ...f, budgetRange: { ...f.budgetRange, [field]: val } }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      const url = await uploadFile(file);
      setLogoUrl(url);
    } catch (err) {
      setError("Logo upload failed: " + err.message);
    } finally {
      setLogoLoading(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerLoading(true);
    try {
      const url = await uploadFile(file);
      setBannerUrl(url);
    } catch (err) {
      setError("Banner upload failed: " + err.message);
    } finally {
      setBannerLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const certList = form.certifications
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          businessDescription: form.businessDescription.trim(),
          phone: form.phone.trim(),
          businessLogo: logoUrl,
          businessBanner: bannerUrl,
          minOrderQuantity: form.minOrderQuantity
            ? Number(form.minOrderQuantity)
            : undefined,
          businessAddress: form.businessAddress,
          manufacturingCapabilities: form.manufacturingCapabilities,
          materialsAvailable: form.materialsAvailable,
          budgetRange: {
            min: form.budgetRange.min
              ? Number(form.budgetRange.min)
              : undefined,
            max: form.budgetRange.max
              ? Number(form.budgetRange.max)
              : undefined,
          },
          certifications: certList,
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <Alert type="error" message={error} />

      {/* Branding */}
      <Section
        title="Branding Assets"
        desc="Your brand identity across the Craftit marketplace."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Banner */}
          <div className="lg:col-span-2">
            <Label>Business Banner</Label>
            <div className="relative h-40 bg-white/5 rounded-3xl overflow-hidden border border-white/10 group/banner">
              {bannerLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                  <span className="w-8 h-8 border-3 border-white/20 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : bannerUrl ? (
                <Image
                  src={bannerUrl}
                  alt="Banner"
                  fill
                  className="object-cover transition-transform duration-700 group-hover/banner:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-20">
                  <span className="material-symbols-outlined text-4xl">
                    image
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    No banner active
                  </p>
                </div>
              )}
              <label className="absolute bottom-4 right-4 z-10 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer shadow-2xl transition-all active:scale-95">
                {bannerUrl ? "Update Banner" : "Upload Banner"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Logo */}
          <div className="flex flex-col">
            <Label>Business Logo</Label>
            <div className="flex-1 flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-3xl">
              <div className="w-20 h-20 rounded-2xl border border-white/10 overflow-hidden bg-black/20 relative shrink-0">
                {logoLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="w-5 h-5 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/10 font-black text-3xl">
                      {form.businessName?.charAt(0)?.toUpperCase() || "M"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[10px] text-white/30 font-bold leading-relaxed uppercase tracking-tight">
                  Square logo recommended (512x512)
                </p>
                <label className="w-fit flex items-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-purple-400 cursor-pointer transition-all active:scale-95">
                  <span className="material-symbols-outlined text-sm font-black">
                    cloud_upload
                  </span>
                  Update
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Business info */}
      <Section title="Operational Identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <Label>Legal Business Name</Label>
            <Input
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="Acme Manufacturing Ltd."
              required
            />
          </div>
          <div>
            <Label>Business Contact Number</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </div>
          <div>
            <Label>Registered Email</Label>
            <div className="relative group">
              <Input
                value={user?.email || ""}
                disabled
                className="bg-white/5 border-white/5 text-white/30 cursor-not-allowed italic"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-30">
                <span className="material-symbols-outlined text-sm">lock</span>
              </div>
            </div>
            <p className="text-[10px] font-black text-white/10 mt-2 uppercase tracking-widest px-1">
              Immutable Identifier
            </p>
          </div>
          <div>
            <Label>Minimum Order Commitment</Label>
            <Input
              value={form.minOrderQuantity}
              onChange={(e) => set("minOrderQuantity", e.target.value)}
              placeholder="50"
              type="number"
              min={1}
            />
          </div>
        </div>
        <div className="mt-8">
          <Label>Business Ethos & Description</Label>
          <Textarea
            value={form.businessDescription}
            onChange={(e) => set("businessDescription", e.target.value)}
            rows={4}
            placeholder="Outline your technical legacy, specialized workflows, and unique manufacturing value proposition…"
          />
        </div>
      </Section>

      {/* Business address */}
      <Section title="Geographic Headquarters">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="sm:col-span-2">
            <Label>Street Facility Address</Label>
            <Input
              value={form.businessAddress.street}
              onChange={(e) => setAddr("street", e.target.value)}
              placeholder="123 Factory Road"
            />
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={form.businessAddress.city}
              onChange={(e) => setAddr("city", e.target.value)}
              placeholder="Detroit"
            />
          </div>
          <div>
            <Label>State / Region</Label>
            <Input
              value={form.businessAddress.state}
              onChange={(e) => setAddr("state", e.target.value)}
              placeholder="MI"
            />
          </div>
          <div>
            <Label>Country Jurisdiction</Label>
            <Input
              value={form.businessAddress.country}
              onChange={(e) => setAddr("country", e.target.value)}
              placeholder="United States"
            />
          </div>
          <div>
            <Label>Postal Index Code</Label>
            <Input
              value={form.businessAddress.postalCode}
              onChange={(e) => setAddr("postalCode", e.target.value)}
              placeholder="48201"
            />
          </div>
        </div>
      </Section>

      {/* Capabilities */}
      <Section
        title="Manufacturing Capabilities"
        desc="Select all that apply. These appear as filter tags on your public profile."
      >
        <ChipSelector
          options={ALL_CAPABILITIES}
          selected={form.manufacturingCapabilities}
          onChange={(val) => set("manufacturingCapabilities", val)}
        />
        {form.manufacturingCapabilities.length === 0 && (
          <p className="text-[10px] font-black uppercase tracking-widest text-white/10 mt-5 px-1">
            No capabilities selected yet.
          </p>
        )}
      </Section>

      {/* Materials */}
      <Section
        title="Materials Available"
        desc="What materials do you work with?"
      >
        <ChipSelector
          options={ALL_MATERIALS}
          selected={form.materialsAvailable}
          onChange={(val) => set("materialsAvailable", val)}
        />
      </Section>

      {/* Budget & certifications */}
      <Section title="Project Scale & Standards">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <Label>Min Project Threshold (USD)</Label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-sm font-black">
                $
              </span>
              <Input
                value={form.budgetRange.min}
                onChange={(e) => setBudget("min", e.target.value)}
                placeholder="500"
                type="number"
                min={0}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label>Max Project Capacity (USD)</Label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-sm font-black">
                $
              </span>
              <Input
                value={form.budgetRange.max}
                onChange={(e) => setBudget("max", e.target.value)}
                placeholder="50000"
                type="number"
                min={0}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        <div>
          <Label optional>Industry Certifications</Label>
          <Input
            value={form.certifications}
            onChange={(e) => set("certifications", e.target.value)}
            placeholder="ISO 9001, AS9100, IATF 16949 (comma-separated)"
          />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/10 mt-3 px-1">
            Separate multiple credentials with commas for indexing.
          </p>
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton loading={loading} saved={saved} />
      </div>
    </form>
  );
}

// ─── PAYOUTS TAB ─────────────────────────────────────────────────────────────
function PayoutsTab({ user }) {
  return <StripeConnectPayoutsTab user={user} />;
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

  const hasLocalPassword = Boolean(user?.hasLocalPassword);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

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
          currentPassword: hasLocalPassword ? form.currentPassword : undefined,
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
    <div className="space-y-8">
      <Section
        title={hasLocalPassword ? "Access Credentials" : "Set Credentials"}
        desc={
          hasLocalPassword
            ? "Update your authentication parameters to maintain security."
            : "Set up your authentication parameters to secure your account."
        }
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <Alert type="error" message={error} />
          {saved && (
            <Alert
              type="success"
              message={
                hasLocalPassword
                  ? "Security credentials synchronized successfully."
                  : "Security credentials set successfully."
              }
            />
          )}
          <div className="grid grid-cols-1 gap-8">
            {hasLocalPassword && (
              <div>
                <Label>Verify Identity (Current Password)</Label>
                <Input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => set("currentPassword", e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-white/5">
              <div>
                <Label>
                  {hasLocalPassword ? "New Security Key" : "Security Key"}
                </Label>
                <Input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => set("newPassword", e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label>Re-verify Security Key</Label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Repeat security key"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <SaveButton loading={loading} saved={saved}>
              {hasLocalPassword ? "Update Credentials" : "Set Credentials"}
            </SaveButton>
          </div>
        </form>
      </Section>

      <Section title="Account Metadata">
        <div className="grid grid-cols-1 gap-1">
          {[
            { label: "Root Identifier", value: user?.email },
            { label: "Entity Classification", value: "Manufacturer Node" },
            {
              label: "Verification Index",
              value: user?.verificationStatus,
              badge: true,
            },
            {
              label: "Genesis Date",
              value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "—",
            },
            {
              label: "Pulse Check",
              value: user?.lastActive
                ? new Date(user.lastActive).toLocaleDateString()
                : "—",
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-4 border-b border-white/5 last:border-0"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                {row.label}
              </span>
              {row.badge ? (
                <span
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                    user?.verificationStatus === "verified"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : user?.verificationStatus === "suspended"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {user?.verificationStatus || "unverified"}
                </span>
              ) : (
                <span className="text-xs font-black text-white/70">
                  {row.value || "—"}
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── VERIFICATION TAB ─────────────────────────────────────────────────────────
function VerificationTab({ user }) {
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState("business_license");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");

  const isVerified = user?.verificationStatus === "verified";
  const submittedDocsCount = Array.isArray(
    user?.verificationDocuments?.documents,
  )
    ? user.verificationDocuments.documents.length
    : 0;
  const isPending =
    user?.verificationStatus === "unverified" && submittedDocsCount > 0;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one document.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const fileType =
          lowerName.endsWith(".pdf") ||
          lowerName.endsWith(".doc") ||
          lowerName.endsWith(".docx")
            ? "document"
            : "image";
        const url = await uploadFile(file, fileType);
        uploadedDocs.push({
          url,
          filename: file.name,
          fileSize: file.size,
        });
      }

      const res = await fetch("/api/verification-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: uploadedDocs, docType }),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || data.message || "Submission failed");
      setUploaded(true);
      setFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status banner */}
      {isVerified ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 flex items-center gap-6 backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <span className="material-symbols-outlined text-white text-2xl font-black">
              verified
            </span>
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-widest">
              Protocol Authorization Verified ✓
            </p>
            <p className="text-xs text-white/40 mt-1.5 font-medium leading-relaxed">
              Your manufacturing credentials have been synchronized and
              validated by the Craftit network authority.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex items-center gap-6 backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <span className="material-symbols-outlined text-white text-2xl font-black">
              pending
            </span>
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-widest">
              Identity Synchronization Required
            </p>
            <p className="text-xs text-white/40 mt-1.5 font-medium leading-relaxed">
              {isPending
                ? "Your document stream is currently undergoing manual audit by our verification nodes (E.T.A 1-3 Cycles)."
                : "Initiate document upload to establish network trust and unlock high-tier manufacturer privileges."}
            </p>
          </div>
        </div>
      )}

      {/* What verification unlocks */}
      <Section title="Ecosystem Advantages">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: "verified_user",
              label: "Network Badge",
              desc: "Prominent trust indicator across global product indexes.",
            },
            {
              icon: "analytics",
              label: "Algorithmic Priority",
              desc: "Increased visibility in manufacturer discovery feeds.",
            },
            {
              icon: "handshake",
              label: "Direct RFQ Access",
              desc: "Higher conversion rate from high-value enterprise accounts.",
            },
            {
              icon: "support_agent",
              label: "Node Support",
              desc: "24/7 priority access to account engineering support.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-4 p-5 bg-white/5 border border-white/5 rounded-3xl hover:border-white/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-purple-400 text-lg">
                  {item.icon}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">
                  {item.label}
                </p>
                <p className="text-xs text-white/30 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Upload form */}
      {!isVerified && (
        <Section
          title="Identity Synchronization"
          desc="Authorized formats: PDF, JPG, PNG. Max 10MB per stream."
        >
          {uploaded ? (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-emerald-400">
                  check_circle
                </span>
              </div>
              <p className="text-sm font-black text-white uppercase tracking-widest">
                Data Stream Submitted
              </p>
              <p className="text-xs text-white/30 mt-2 font-medium max-w-xs">
                Our verification nodes will audit your documents within 1–3
                business cycles.
              </p>
              <button
                onClick={() => setUploaded(false)}
                className="mt-6 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
              >
                Sync Additional Documents
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-8">
              <Alert type="error" message={error} />
              <div>
                <Label>Document Classification</Label>
                <div className="relative group">
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-purple-500/50 appearance-none transition-all cursor-pointer"
                  >
                    <option value="business_license" className="bg-[#050507]">
                      Business License
                    </option>
                    <option value="tax_registration" className="bg-[#050507]">
                      Tax Registration
                    </option>
                    <option value="certification" className="bg-[#050507]">
                      Industry Certification (ISO, etc.)
                    </option>
                    <option value="identity" className="bg-[#050507]">
                      Owner Identity Document
                    </option>
                    <option value="insurance" className="bg-[#050507]">
                      Insurance Certificate
                    </option>
                    <option value="bank_verification" className="bg-[#050507]">
                      Bank Verification
                    </option>
                    <option value="other" className="bg-[#050507]">
                      Other Metadata
                    </option>
                  </select>
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/20 pointer-events-none transition-transform group-hover:translate-y-[-40%]">
                    expand_more
                  </span>
                </div>
              </div>
              <div>
                <Label>Metadata Stream Selection</Label>
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/5 rounded-[2rem] cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/30 transition-all group">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-purple-500/40 group-hover:text-purple-400 transition-colors">
                      cloud_upload
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {files.length > 0
                      ? `${files.length} file${files.length > 1 ? "s" : ""} staged`
                      : "Initialize Document Upload"}
                  </span>
                  <span className="text-[9px] font-black text-white/10 uppercase tracking-widest mt-2">
                    PDF, JPG, PNG — MAX 10MB PER BLOB
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={uploading || files.length === 0}
                  className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg ${
                    uploading || files.length === 0
                      ? "bg-purple-600/30 text-white/30 cursor-not-allowed border border-white/5"
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20 active:scale-95"
                  }`}
                >
                  {uploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Syncing…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm font-black">
                        publish
                      </span>
                      Submit Documents
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </Section>
      )}
    </div>
  );
}

function ManufacturerSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const requestedTab = searchParams.get("tab") || "profile";
  const initialTab = requestedTab === "payment" ? "payouts" : requestedTab;
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
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchUser();
    }
  }, [status, session, router, fetchUser]);

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="INITIALIZING PROTOCOLS..." />;
  }

  const tabs = [
    { key: "profile", label: "Business Profile", icon: "business" },
    { key: "payouts", label: "Payouts", icon: "account_balance" },
    { key: "security", label: "Security", icon: "lock" },
    { key: "verification", label: "Verification", icon: "verified" },
  ];

  const isVerified = user?.verificationStatus === "verified";

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-10">
        {!isVerified && (
          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab("verification")}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all active:scale-95 shadow-lg shadow-amber-500/5"
            >
              <span className="material-symbols-outlined text-sm font-black animate-pulse">
                warning
              </span>
              Identity Synchronization Required
            </button>
          </div>
        )}

        {fetchError && <Alert type="error" message={fetchError} />}

        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728]">
            Ecosystem Configuration
          </p>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent">
              Manufacturer Settings
            </span>
          </h1>
          <p className="text-sm text-white/35 font-medium">
            Manage your network identity, security protocols, and verification
            status.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white/[0.03] border border-white/10 rounded-2xl p-1.5 w-fit shadow-2xl backdrop-blur-md">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-sm font-black">
                {tab.icon}
              </span>
              {tab.label}
              {tab.key === "verification" && !isVerified && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
              )}
            </button>
          ))}
        </div>

        <div className="pt-2">
          {activeTab === "profile" && (
            <BusinessProfileTab user={user} onRefresh={fetchUser} />
          )}
          {activeTab === "payouts" && <PayoutsTab user={user} />}
          {activeTab === "security" && <SecurityTab user={user} />}
          {activeTab === "verification" && <VerificationTab user={user} />}
        </div>
      </div>
    </div>
  );
}

export default function ManufacturerSettingsPage() {
  return (
    <Suspense
      fallback={<GlobalLoader fullScreen text="CALIBRATING SYSTEMS..." />}
    >
      <ManufacturerSettingsPageContent />
    </Suspense>
  );
}
