// app/auth/signup/customer/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/CrafitLogo";
import leftArrow from "@/assets/backArrow.png";
import googleLogo from "@/assets/google.png";

export default function CustomerSignup() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    city: "",
    country: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "customer") {
        router.replace("/customer");
      } else if (role === "manufacturer") {
        router.replace("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.replace("/admin/dashboard");
      }
    }
  }, [status, session, router]);

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
      const response = await fetch("/api/auth/register/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          location: {
            city: formData.city || undefined,
            country: formData.country || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          data.message ||
            "Registration successful. Please verify your email before login.",
        );
        router.replace("/auth/login");
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
    <div className="min-h-screen w-full bg-[#060111] text-white font-sans relative overflow-x-hidden flex flex-col">
      <header className="relative z-50 w-full p-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/auth/signup"
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-all group"
          >
            <div className="relative w-4 h-4 group-hover:-translate-x-1 transition-transform">
              <Image
                src={leftArrow}
                alt="back"
                fill
                sizes="16px"
                className="object-contain opacity-70"
              />
            </div>
            Back
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-black tracking-tighter italic uppercase">
            Craftit
          </span>
        </div>
        <div className="w-16" />
      </header>

      <main className="grow flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-xl bg-white/3 backdrop-blur-xl border border-white/10 rounded-[35px] p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-8">
            <span className="text-[9px] font-bold text-purple-400 uppercase tracking-[0.4em] block mb-2">
              Customer Access
            </span>
            <h1 className="text-3xl font-black italic uppercase tracking-tight">
              Create Account
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Full Name *
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Email *
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Phone
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(optional)"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  City
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Country
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-16 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-purple-300 hover:text-purple-200"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Confirm *
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-16 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-purple-300 hover:text-purple-200"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2 px-2">
              <input
                id="terms"
                type="checkbox"
                required
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500 transition-all cursor-pointer"
              />
              <label
                htmlFor="terms"
                className="text-[15px] text-slate-400 leading-tight cursor-pointer"
              >
                I agree to the{" "}
                <Link href="#" className="text-purple-400 hover:underline">
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-purple-400 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 py-2 px-4 rounded-xl text-[10px] text-red-400 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Create Account"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-bold">
              <span className="px-4 bg-[#0B011D] text-slate-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => signIn("google")}
              className="flex items-center justify-center gap-3 bg-white/3 border border-white/10 py-3 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              <Image src={googleLogo} width={16} height={16} alt="google" />
              Google
            </button>
          </div>

          <p className="mt-8 text-center text-[10px] text-slate-500 uppercase tracking-widest">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-black text-amber-500 hover:text-amber-400 ml-1"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
