// app/auth/signup/manufacturer/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ManufacturerSignup() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessType: "",
    businessRegistrationNumber: "",
    businessDescription: "",
    city: "",
    state: "",
    country: "",
  });
  const [capabilities, setCapabilities] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "customer") {
        router.push("/customer");
      } else if (role === "manufacturer") {
        router.push("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  }, [status, session, router]);

  const capabilityOptions = [
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

  const materialOptions = [
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

  const toggleCapability = (cap) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  };

  const toggleMaterial = (mat) => {
    setMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register/manufacturer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          businessName: formData.businessName,
          businessEmail: formData.businessEmail || formData.email,
          businessPhone: formData.businessPhone || formData.phone || undefined,
          businessType: formData.businessType || undefined,
          businessRegistrationNumber:
            formData.businessRegistrationNumber || undefined,
          businessDescription: formData.businessDescription || undefined,
          manufacturingCapabilities: capabilities,
          materialsAvailable: materials,
          location: {
            city: formData.city || undefined,
            state: formData.state || undefined,
            country: formData.country || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          data.message ||
            "Registration successful. Verify your email before login.",
        );
        router.push("/auth/login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="w-full p-4 sm:p-6">
        <div className="container mx-auto flex items-center justify-between">
          <Link
            href="/auth/signup"
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-slate-700 dark:text-slate-300">←</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xl">🏭</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              Craftit
            </span>
          </div>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="grow flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-orange-50/50 dark:bg-slate-800 rounded-2xl p-8 md:p-12 shadow-lg my-8">
          <h1 className="text-center text-3xl font-bold mb-8 text-slate-900 dark:text-white">
            Create Manufacturer Account
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Personal Information */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  CEO / Contact Person Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="Enter CEO / contact person name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Personal Mobile Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="e.g. +92 300 1234567"
                  required
                />
              </div>

              {/* Business Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business Email *
                </label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, businessEmail: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="office@yourcompany.com"
                  required
                />
              </div>

              {/* Business Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business / Office Phone *
                </label>
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, businessPhone: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="e.g. +92 21 1234567"
                  required
                />
              </div>

              {/* Business Information */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="Enter business name"
                  required
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business Type *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) =>
                    setFormData({ ...formData, businessType: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 focus:ring-amber-600 focus:border-amber-600"
                  required
                >
                  <option value="">Select business type</option>
                  <option value="sole_proprietorship">
                    Sole Proprietorship
                  </option>
                  <option value="partnership">Partnership</option>
                  <option value="private_limited">
                    Private Limited (Pvt. Ltd.)
                  </option>
                  <option value="public_limited">Public Limited</option>
                  <option value="ngo">NGO / Non-Profit</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Business Registration Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business Registration Number
                </label>
                <input
                  type="text"
                  value={formData.businessRegistrationNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      businessRegistrationNumber: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="Enter registration number (optional)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business Description
                </label>
                <textarea
                  value={formData.businessDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      businessDescription: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="Tell us about your business (optional)"
                  rows="3"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="Your city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="Your state"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                  placeholder="Your country"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password *
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="block w-full rounded-md border-slate-300 shadow-sm bg-white pr-16 dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                    placeholder="Create password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm Password *
                </label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border-slate-300 shadow-sm bg-white pr-16 dark:bg-slate-700 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-amber-600 focus:border-amber-600"
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            {/* Manufacturing Capabilities */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Manufacturing Capabilities
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {capabilityOptions.map((cap) => (
                  <label
                    key={cap}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={capabilities.includes(cap)}
                      onChange={() => toggleCapability(cap)}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {cap.replace(/_/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Available Materials */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Available Materials
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {materialOptions.map((mat) => (
                  <label
                    key={mat}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={materials.includes(mat)}
                      onChange={() => toggleMaterial(mat)}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {mat.replace(/_/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center mt-6">
              <input
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                id="terms"
                type="checkbox"
                required
              />
              <label
                className="ml-3 block text-sm text-slate-600 dark:text-slate-400"
                htmlFor="terms"
              >
                I agree to the{" "}
                <a
                  className="font-medium text-amber-600 hover:text-amber-700"
                  href="#"
                >
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a
                  className="font-medium text-amber-600 hover:text-amber-700"
                  href="#"
                >
                  Privacy Policy
                </a>
              </label>
            </div>

            {error && (
              <div className="mt-6 rounded-md bg-red-50 border border-red-200 p-3 dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-orange-50/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Or continue with
                  </span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-3 text-[#1877F2]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89H8.038v-2.89h2.399v-2.19c0-2.384 1.435-3.69 3.593-3.69 1.03 0 1.913.077 2.17.11V8.5h-1.408c-1.16 0-1.387.55-1.387 1.363v1.766h2.827l-.368 2.89h-2.459v7.039C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                  Facebook
                </button>
              </div>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              className="font-medium text-amber-600 hover:text-amber-700"
              href="/auth/login"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
