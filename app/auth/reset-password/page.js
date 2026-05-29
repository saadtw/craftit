// app/auth/reset-password/page.js
// Handles Supabase's password reset redirect which delivers the token as a
// URL hash fragment: /auth/reset-password#access_token=...&type=recovery
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Extract access_token from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove leading "#"
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const type = params.get("type");

    if (token && type === "recovery") {
      setAccessToken(token);
    }
    setTokenChecked(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to reset password");
      }

      setMessage("Password reset successfully. Redirecting to login…");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err) {
      setError(err.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state while checking hash ────────────────────────────────────
  if (!tokenChecked) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
      </div>
    );
  }

  // ── Invalid / missing token ───────────────────────────────────────────────
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-10 text-white">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-white/8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-2">
                Account Recovery
              </p>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Reset Password
              </h1>
            </div>
            <div className="px-8 py-6 space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                Invalid or expired reset link. Please request a new one.
              </div>
              <Link
                href="/auth/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-black hover:bg-[#d4871f] transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                Request New Reset Link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Reset password form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-2">
              Account Recovery
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Set New Password
            </h1>
            <p className="mt-1.5 text-sm text-white/40">
              Choose a strong password with at least 8 characters.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 pr-16 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors"
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wide text-[#eb9728]/60 hover:text-[#eb9728] transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 pr-16 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors"
                  placeholder="Repeat your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wide text-[#eb9728]/60 hover:text-[#eb9728] transition-colors"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-black hover:bg-[#d4871f] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  Reset Password
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-xs text-white/25 text-center">
          <Link
            href="/auth/login"
            className="text-[#eb9728] font-semibold hover:text-[#d4871f] transition-colors"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
