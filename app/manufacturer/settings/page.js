// app/manufacturer/settings/page.js
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

// ─── Small helpers ────────────────────────────────────────────────────────────
function Label({ children, optional = false }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
      {optional && (
        <span className="ml-1 text-gray-300 normal-case font-normal">
          (optional)
        </span>
      )}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-colors ${className}`}
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-colors resize-none ${className}`}
      {...props}
    />
  );
}

function SaveButton({ loading, saved, children = "Save Changes" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
        saved
          ? "bg-green-500 cursor-default"
          : loading
            ? "bg-orange-400/70 cursor-not-allowed"
            : "bg-orange-500 hover:bg-orange-600 shadow-sm hover:shadow"
      }`}
    >
      {saved ? (
        <>
          <span className="material-symbols-outlined text-base">check</span>
          Saved!
        </>
      ) : loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {(title || desc) && (
        <div className="mb-5 pb-5 border-b border-gray-100">
          {title && (
            <h3 className="text-base font-bold text-blue-900">{title}</h3>
          )}
          {desc && <p className="text-sm text-gray-400 mt-0.5">{desc}</p>}
        </div>
      )}
      {children}
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
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              active
                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <Alert type="error" message={error} />

      {/* Branding */}
      <Section
        title="Branding"
        desc="Your logo and banner appear on your public profile page."
      >
        {/* Banner */}
        <div className="mb-5">
          <Label>Business Banner</Label>
          <div className="relative h-32 bg-linear-to-br from-blue-100 to-blue-200 rounded-xl overflow-hidden border border-gray-200">
            {bannerLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bannerUrl ? (
              <Image
                src={bannerUrl}
                alt="Banner"
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-blue-400">No banner uploaded</p>
              </div>
            )}
            <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 text-xs font-semibold rounded-lg cursor-pointer shadow transition-colors">
              {bannerUrl ? "Change" : "Upload Banner"}
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
        <div>
          <Label>Business Logo</Label>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-50 relative shrink-0">
              {logoLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <span className="w-5 h-5 border-2 border-gray-400 border-t-orange-500 rounded-full animate-spin" />
                </div>
              ) : logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-50">
                  <span className="text-blue-300 font-black text-3xl">
                    {form.businessName?.charAt(0)?.toUpperCase() || "M"}
                  </span>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-600 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-base">
                upload
              </span>
              Upload Logo
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Section>

      {/* Business info */}
      <Section title="Business Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Business Name</Label>
            <Input
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="Acme Manufacturing Ltd."
              required
            />
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
            <Label>Email</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Email cannot be changed.
            </p>
          </div>
          <div>
            <Label>Minimum Order Quantity</Label>
            <Input
              value={form.minOrderQuantity}
              onChange={(e) => set("minOrderQuantity", e.target.value)}
              placeholder="50"
              type="number"
              min={1}
            />
          </div>
        </div>
        <div className="mt-4">
          <Label>Business Description</Label>
          <Textarea
            value={form.businessDescription}
            onChange={(e) => set("businessDescription", e.target.value)}
            rows={4}
            placeholder="Describe your manufacturing business, specialties, and what makes you unique…"
          />
        </div>
      </Section>

      {/* Business address */}
      <Section title="Business Address">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Street Address</Label>
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
            <Label>State / Province</Label>
            <Input
              value={form.businessAddress.state}
              onChange={(e) => setAddr("state", e.target.value)}
              placeholder="MI"
            />
          </div>
          <div>
            <Label>Country</Label>
            <Input
              value={form.businessAddress.country}
              onChange={(e) => setAddr("country", e.target.value)}
              placeholder="United States"
            />
          </div>
          <div>
            <Label>Postal Code</Label>
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
          <p className="text-xs text-gray-400 mt-3">
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
      <Section title="Budget Range & Certifications">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Min Project Budget ($)</Label>
            <Input
              value={form.budgetRange.min}
              onChange={(e) => setBudget("min", e.target.value)}
              placeholder="500"
              type="number"
              min={0}
            />
          </div>
          <div>
            <Label>Max Project Budget ($)</Label>
            <Input
              value={form.budgetRange.max}
              onChange={(e) => setBudget("max", e.target.value)}
              placeholder="50000"
              type="number"
              min={0}
            />
          </div>
        </div>
        <div>
          <Label optional>Certifications</Label>
          <Input
            value={form.certifications}
            onChange={(e) => set("certifications", e.target.value)}
            placeholder="ISO 9001, AS9100, IATF 16949 (comma-separated)"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Separate multiple certifications with commas.
          </p>
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton loading={loading} saved={saved} />
      </div>
    </form>
  );
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
    <div className="space-y-5">
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
          <div className="flex justify-end">
            <SaveButton loading={loading} saved={saved}>
              Update Password
            </SaveButton>
          </div>
        </form>
      </Section>

      <Section title="Account Details">
        <div className="space-y-0 text-sm divide-y divide-gray-50">
          {[
            { label: "Email", value: user?.email },
            { label: "Account Type", value: "Manufacturer" },
            {
              label: "Verification Status",
              value: user?.verificationStatus,
              badge: true,
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
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3"
            >
              <span className="text-gray-500">{row.label}</span>
              {row.badge ? (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user?.verificationStatus === "verified"
                      ? "bg-blue-100 text-blue-700"
                      : user?.verificationStatus === "suspended"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {user?.verificationStatus || "unverified"}
                </span>
              ) : (
                <span className="font-semibold text-gray-900">
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
    <div className="space-y-5">
      {/* Status banner */}
      {isVerified ? (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-blue-900">
              Your account is Verified ✓
            </p>
            <p className="text-sm text-blue-600 mt-0.5">
              Your business documents have been reviewed and approved by Craftit
              admins.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-amber-500 text-2xl shrink-0 mt-0.5">
            pending
          </span>
          <div>
            <p className="text-base font-bold text-amber-800">
              Verification Pending
            </p>
            <p className="text-sm text-amber-600 mt-0.5">
              {isPending
                ? "Your documents have been submitted and are under review. This typically takes 1–3 business days."
                : "Upload your business documents below to begin the verification process and earn the Verified badge."}
            </p>
          </div>
        </div>
      )}

      {/* What verification unlocks */}
      <Section title="What Verification Unlocks">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: "verified",
              label: "Verified Badge",
              desc: "Displayed prominently on your profile and product listings.",
            },
            {
              icon: "trending_up",
              label: "Higher Visibility",
              desc: "Verified manufacturers rank higher in search results.",
            },
            {
              icon: "shield",
              label: "Customer Trust",
              desc: "Customers are more likely to send RFQs to verified manufacturers.",
            },
            {
              icon: "workspace_premium",
              label: "Priority Support",
              desc: "Access to dedicated account support.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
            >
              <span className="material-symbols-outlined text-blue-500 text-lg shrink-0 mt-0.5">
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Upload form */}
      {!isVerified && (
        <Section
          title="Upload Business Documents"
          desc="Accepted formats: PDF, JPG, PNG. Max 10MB per file."
        >
          {uploaded ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-4xl text-green-400 block mb-2">
                check_circle
              </span>
              <p className="text-base font-bold text-gray-900">
                Documents submitted!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Our team will review your documents within 1–3 business days.
              </p>
              <button
                onClick={() => setUploaded(false)}
                className="mt-4 text-xs text-orange-500 underline"
              >
                Upload more documents
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              <Alert type="error" message={error} />
              <div>
                <Label>Document Type</Label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-colors"
                >
                  <option value="business_license">Business License</option>
                  <option value="tax_registration">Tax Registration</option>
                  <option value="certification">
                    Industry Certification (ISO, AS9100, etc.)
                  </option>
                  <option value="identity">Owner Identity Document</option>
                  <option value="insurance">Insurance Certificate</option>
                  <option value="bank_verification">Bank Verification</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Select Files</Label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-orange-50 hover:border-orange-300 transition-all">
                  <span className="material-symbols-outlined text-3xl text-gray-300 mb-1">
                    upload_file
                  </span>
                  <span className="text-sm text-gray-500">
                    {files.length > 0
                      ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                      : "Click to select or drag & drop"}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    PDF, JPG, PNG — max 10MB
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
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading || files.length === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
                    uploading || files.length === 0
                      ? "bg-orange-400/50 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 shadow-sm"
                  }`}
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        upload
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
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchUser();
    }
  }, [status, session, router, fetchUser]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "profile", label: "Business Profile", icon: "business" },
    { key: "security", label: "Security", icon: "lock" },
    { key: "verification", label: "Verification", icon: "verified" },
  ];

  const isVerified = user?.verificationStatus === "verified";

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-5xl">
        {!isVerified && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setActiveTab("verification")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">warning</span>
              Get Verified
            </button>
          </div>
        )}

        {fetchError && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            {fetchError}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-blue-900">
            Account Settings
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage your business profile, security, and verification status.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm mb-6 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {tab.icon}
              </span>
              {tab.label}
              {tab.key === "verification" && !isVerified && (
                <span className="w-2 h-2 rounded-full bg-amber-400 ml-0.5" />
              )}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <BusinessProfileTab user={user} onRefresh={fetchUser} />
        )}
        {activeTab === "security" && <SecurityTab user={user} />}
        {activeTab === "verification" && <VerificationTab user={user} />}
      </div>
    </div>
  );
}

export default function ManufacturerSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ManufacturerSettingsPageContent />
    </Suspense>
  );
}
