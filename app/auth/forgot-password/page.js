// app/auth/forgot-password/page.js
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

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

      setMessage(data.message || "Reset instructions have been sent.");
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

  return (
    <div className="min-h-screen bg-[#0B011D] flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-black tracking-tight">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your email and we will generate a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-purple-400"
              placeholder="you@example.com"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </div>
          )}

          {devResetUrl && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 break-all">
              Development reset link:{" "}
              <a href={devResetUrl} className="underline">
                {devResetUrl}
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold uppercase tracking-widest hover:bg-purple-500 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400 text-center">
          Remembered your password?{" "}
          <Link
            href="/auth/login"
            className="text-amber-400 font-semibold hover:text-amber-300"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
