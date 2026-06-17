// app/auth/setup-password/page.js
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, getSession } from "next-auth/react";
import Logo from "@/components/CrafitLogo";

export default function SetupPassword() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const refreshedSessionRef = useRef(false);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(true);

  const passwordRules = useMemo(() => {
    const value = formData.password;
    return {
      length: value.length >= 8,
      lower: /[a-z]/.test(value),
      upper: /[A-Z]/.test(value),
      number: /\d/.test(value),
    };
  }, [formData.password]);

  const passwordsMatch =
    formData.password.length > 0 &&
    formData.password === formData.confirmPassword;
  const isPasswordValid =
    passwordRules.length &&
    passwordRules.lower &&
    passwordRules.upper &&
    passwordRules.number &&
    passwordsMatch;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }

    if (status !== "authenticated") return;

    if (!refreshedSessionRef.current) {
      refreshedSessionRef.current = true;
      update().finally(() => setIsUpdating(false));
      return;
    }

    if (!isUpdating && !session?.user?.needsPasswordSetup) {
      // Already set password, redirect to dashboard
      const role = session.user.role || "customer";
      if (role === "customer") router.replace("/customer");
      else if (role === "manufacturer")
        router.replace("/manufacturer/dashboard");
      else if (role === "admin") router.replace("/admin/dashboard");
    }
  }, [status, session, router, update, isUpdating]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: formData.password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to set up password");
      }

      setSuccess(true);
      const updatedSession = await update();
      const nextSession = updatedSession || (await getSession());
      const role = nextSession?.user?.role || session?.user?.role || "customer";
      if (role === "customer") router.replace("/customer");
      else if (role === "manufacturer")
        router.replace("/manufacturer/dashboard");
      else if (role === "admin") router.replace("/admin/dashboard");
      else router.replace("/customer");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || success || isUpdating) {
    return (
      <div className="min-h-screen bg-[#0B011D] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B011D] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-amber-600/10 blur-[100px]" />

      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[30px] p-8 md:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo className="h-10 w-10 text-amber-500" />
          </div>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.3em]">
            Security
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Setup Password
          </h1>
          <p className="text-sm text-white/50 mt-2 font-medium">
            Please set a password for your account to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block ml-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-purple-500 transition-all placeholder:text-slate-600"
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

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block ml-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-purple-500 transition-all placeholder:text-slate-600"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
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

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px] uppercase tracking-widest text-white/40 space-y-1">
            <p
              className={
                passwordRules.length ? "text-emerald-400" : "text-white/40"
              }
            >
              {passwordRules.length ? "✓" : "•"} At least 8 characters
            </p>
            <p
              className={
                passwordRules.lower ? "text-emerald-400" : "text-white/40"
              }
            >
              {passwordRules.lower ? "✓" : "•"} One lowercase letter
            </p>
            <p
              className={
                passwordRules.upper ? "text-emerald-400" : "text-white/40"
              }
            >
              {passwordRules.upper ? "✓" : "•"} One uppercase letter
            </p>
            <p
              className={
                passwordRules.number ? "text-emerald-400" : "text-white/40"
              }
            >
              {passwordRules.number ? "✓" : "•"} One number
            </p>
            <p
              className={passwordsMatch ? "text-emerald-400" : "text-white/40"}
            >
              {passwordsMatch ? "✓" : "•"} Passwords match
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 py-2.5 px-4 rounded-xl text-[11px] font-bold text-red-400 text-center uppercase tracking-widest">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className={`w-full rounded-xl py-3.5 text-[11px] font-black shadow-lg transition-all tracking-widest uppercase mt-4 ${
              loading || !isPasswordValid
                ? "bg-purple-600/40 text-white/50 cursor-not-allowed"
                : "bg-purple-600 text-white shadow-purple-500/20 hover:bg-purple-500 active:scale-[0.98]"
            }`}
          >
            {loading ? "Saving..." : "Save Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
