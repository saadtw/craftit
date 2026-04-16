"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus("error");
        setMessage("Verification token missing.");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to verify email");
        }

        setStatus("success");
        setMessage(data.message || "Email verified successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(error.message || "Verification failed.");
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0B011D] flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-black tracking-tight">
          Email Verification
        </h1>
        <p
          className={`mt-4 text-sm ${
            status === "success"
              ? "text-emerald-300"
              : status === "error"
                ? "text-red-300"
                : "text-slate-300"
          }`}
        >
          {message}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/auth/login"
            className="w-full rounded-xl bg-purple-600 py-3 text-center text-sm font-bold uppercase tracking-widest hover:bg-purple-500"
          >
            Go to login
          </Link>
          <Link
            href="/auth/forgot-password"
            className="w-full rounded-xl border border-white/20 py-3 text-center text-sm font-bold uppercase tracking-widest hover:bg-white/10"
          >
            Forgot password
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B011D] flex items-center justify-center px-4 py-10 text-white">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
            <h1 className="text-2xl font-black tracking-tight">
              Email Verification
            </h1>
            <p className="mt-4 text-sm text-slate-300">
              Verifying your email...
            </p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
