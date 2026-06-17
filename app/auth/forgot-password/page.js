// app/auth/forgot-password/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  // OTP Verification State
  const [step, setStep] = useState("request"); // "request" | "verify"
  const [otp, setOtp] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevResetUrl("");

    if (!email) {
      setError("Please provide your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to process your request");
      }

      setMessage(data.message || "Instructions have been sent.");
      setStep("verify");
      if (data.resetUrl) {
        setDevResetUrl(data.resetUrl);
      }
    } catch (requestError) {
      setError(
        requestError.message || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!otp) {
      setError("Please enter the 8-digit code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid code");
      }

      setMessage("Code verified! Redirecting...");
      if (data.access_token) {
        router.push(
          `/auth/reset-password#access_token=${data.access_token}&type=recovery`,
        );
      } else {
        router.push("/auth/reset-password");
      }
    } catch (requestError) {
      setError(requestError.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-10 text-white relative">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-2">
              Account Recovery
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Forgot Password
            </h1>
            <p className="mt-1.5 text-sm text-white/40">
              {step === "request"
                ? "Enter your email and we'll generate a reset link or send a code."
                : `Enter the 8-digit code sent to ${email}`}
            </p>
          </div>

          {/* Form */}
          {step === "request" ? (
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <span className="material-symbols-outlined text-base shrink-0">
                    error
                  </span>
                  {error}
                </div>
              )}

              {message && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <span className="material-symbols-outlined text-base shrink-0">
                    check_circle
                  </span>
                  {message}
                </div>
              )}

              {devResetUrl && (
                <div className="rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/5 px-4 py-3 text-xs text-[#eb9728]/80 break-all">
                  <p className="font-bold mb-1">Development reset link:</p>
                  <a
                    href={devResetUrl}
                    className="underline hover:text-[#eb9728] transition-colors"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-black hover:bg-[#d4871f] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      send
                    </span>
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ""))
                  }
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-center text-lg tracking-[0.5em] font-mono text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors"
                  placeholder="00000000"
                  required
                />
                <p className="mt-2 text-[10px] text-white/30 text-center">
                  If you received a magic link instead, you can just click that
                  link to reset your password.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <span className="material-symbols-outlined text-base shrink-0">
                    error
                  </span>
                  {error}
                </div>
              )}

              {message && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <span className="material-symbols-outlined text-base shrink-0">
                    check_circle
                  </span>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 8}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-black hover:bg-[#d4871f] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>Verify Code</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        <p className="mt-5 text-xs text-white/25 text-center">
          Remembered your password?{" "}
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
