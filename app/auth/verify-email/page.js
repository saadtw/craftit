// app/auth/verify-email/page.js
// Handles Supabase's email-verification redirect which delivers the token as a
// URL hash fragment: /auth/verify-email#access_token=...&type=signup
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    async function verify() {
      // Read hash fragment set by Supabase
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const type = params.get("type");

      // Support legacy ?token= query-param flow as a fallback
      const searchParams = new URLSearchParams(window.location.search);
      const legacyToken = searchParams.get("token");

      const token = accessToken || legacyToken;

      if (!token) {
        setStatus("error");
        setMessage("Verification token missing. Please use the link from your email.");
        return;
      }

      // Only process signup/email_change types; reject other token types
      if (accessToken && type && type !== "signup" && type !== "email_change") {
        setStatus("error");
        setMessage("This link is not a verification link. Please check your email.");
        return;
      }

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: token, token: legacyToken }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to verify email");
        }

        setStatus("success");
        setMessage("Email verified! You can now log in.");

        // Auto-redirect after 3 seconds
        setTimeout(() => router.push("/auth/login"), 3000);
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Verification failed. The link may have expired.");
      }
    }

    verify();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-2">
              Account
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Email Verification
            </h1>
          </div>

          {/* Status */}
          <div className="px-8 py-6 space-y-6">
            {status === "loading" && (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin shrink-0" />
                <p className="text-sm text-white/50">{message}</p>
              </div>
            )}

            {status === "success" && (
              <>
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
                  {message}
                </div>
                <p className="text-xs text-white/30 text-center">
                  Redirecting to login in 3 seconds…
                </p>
              </>
            )}

            {status === "error" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                {message}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href="/auth/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-black hover:bg-[#d4871f] transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                Go to Login
              </Link>
              {status === "error" && (
                <Link
                  href="/auth/forgot-password"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  Forgot Password
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
