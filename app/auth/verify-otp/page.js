// app/auth/verify-otp/page.js
"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const OTP_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const RESEND_COOLDOWN_SECONDS = 60;

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(OTP_EXPIRY_SECONDS);

  const inputRefs = useRef([]);

  // Expiry countdown
  useEffect(() => {
    if (expiryCountdown <= 0) return;
    const interval = setInterval(() => {
      setExpiryCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryCountdown]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (index, value) => {
    // Accept paste of full 8 digits
    if (value.length === 8 && /^\d{8}$/.test(value)) {
      const digits = value.split("");
      setOtp(digits);
      inputRefs.current[7]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const otpString = otp.join("");
    if (otpString.length !== 8) {
      setError("Please enter all 8 digits.");
      return;
    }
    if (!email) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: otpString,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess("Email verified! Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 1500);
      } else {
        setError(data.message || "Verification failed.");
        if (data.locked) {
          setOtp(["", "", "", "", "", "", "", ""]);
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [otp, email, router]);

  // Auto-submit when all 8 digits are entered
  useEffect(() => {
    if (otp.every((d) => d !== "")) {
      handleVerify();
    }
  }, [otp, handleVerify]);

  const handleResend = async () => {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setResendLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setResendCooldown(data.retryAfterSeconds || RESEND_COOLDOWN_SECONDS);
        setError(data.message);
      } else {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setExpiryCountdown(OTP_EXPIRY_SECONDS);
        setOtp(["", "", "", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setSuccess("A new code has been sent to your email.");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B011D] p-4 font-sans relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-amber-600/10 blur-[100px]" />

      {/* Back to login */}
      <Link
        href="/auth/login"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-purple-400 transition-all group"
      >
        <div className="w-6 h-6 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
          <span className="material-symbols-outlined text-white text-[9px]">
            arrow_back
          </span>
        </div>
        Back to Login
      </Link>

      {/* Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-purple-500/30 bg-white/2 backdrop-blur-3xl z-10 text-white shadow-[0_0_50px_rgba(168,85,247,0.15)] p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.3em]">
            Craftit
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-1 leading-none">
            Check your email
          </h1>
          <p className="text-slate-400 mt-2 text-xs">
            We sent an 8-digit code to{" "}
            <span className="font-semibold text-slate-200">
              {email || "your email"}
            </span>
          </p>
        </div>

        {/* Optional email input if not in query */}
        {!emailFromQuery && (
          <div className="mb-4">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs outline-none focus:border-purple-500 transition-all placeholder:text-slate-600 text-white"
            />
          </div>
        )}

        {/* OTP inputs */}
        <div className="flex gap-2 justify-center mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData
                  .getData("text")
                  .replace(/\D/g, "")
                  .slice(0, 8);
                handleOtpChange(i, pasted);
              }}
              className="w-10 h-12 text-center text-lg font-bold border border-white/10 bg-white/5 rounded-xl focus:outline-none focus:border-purple-500 transition-all text-white"
            />
          ))}
        </div>

        {/* Error / Success */}
        {error && (
          <p className="text-[9px] text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 mb-4 text-center">
            {error}
          </p>
        )}
        {success && (
          <p className="text-[9px] text-green-400 bg-green-500/10 p-2 rounded-lg border border-green-500/20 mb-4 text-center">
            {success}
          </p>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 8}
          className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:bg-purple-500 active:scale-[0.98] tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        {/* Expiry */}
        <div className="mt-4 text-center text-xs text-slate-500">
          {expiryCountdown > 0 ? (
            <span>
              Code expires in{" "}
              <span className="font-semibold text-slate-300">
                {formatTime(expiryCountdown)}
              </span>
            </span>
          ) : (
            <span className="text-red-400">Code has expired.</span>
          )}
        </div>

        {/* Resend */}
        <div className="mt-3 text-center text-xs">
          <span className="text-slate-500">Didn&apos;t receive it? </span>
          {resendCooldown > 0 ? (
            <span className="text-slate-600">Resend in {resendCooldown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-purple-400 font-semibold hover:text-purple-300 disabled:opacity-50 transition-colors"
            >
              {resendLoading ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0B011D] text-white text-xs">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
