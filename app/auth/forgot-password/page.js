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
              Enter your email and we&apos;ll generate a reset link.
            </p>
          </div>

          {/* Form */}
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
// app/auth/forgot-password/page.js
// "use client";

// import { useState } from "react";
// import Link from "next/link";

// export default function ForgotPasswordPage() {
//   const [email, setEmail] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [message, setMessage] = useState("");
//   const [devResetUrl, setDevResetUrl] = useState("");

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setError("");
//     setMessage("");
//     setDevResetUrl("");

//     if (!email) {
//       setError("Please provide your email.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await fetch("/api/auth/forgot-password", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email }),
//       });

//       const data = await response.json();
//       if (!response.ok || !data.success) {
//         throw new Error(data.message || "Unable to process your request");
//       }

//       setMessage(data.message || "Reset instructions have been sent.");
//       if (data.resetUrl) {
//         setDevResetUrl(data.resetUrl);
//       }
//     } catch (requestError) {
//       setError(
//         requestError.message || "Something went wrong. Please try again.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#0B011D] flex items-center justify-center px-4 py-10 text-white">
//       <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
//         <h1 className="text-2xl font-black tracking-tight">Forgot Password</h1>
//         <p className="mt-2 text-sm text-slate-300">
//           Enter your email and we will generate a reset link.
//         </p>

//         <form onSubmit={handleSubmit} className="mt-6 space-y-4">
//           <div>
//             <label className="block text-xs uppercase tracking-widest text-slate-400 mb-1">
//               Email Address
//             </label>
//             <input
//               type="email"
//               value={email}
//               onChange={(event) => setEmail(event.target.value)}
//               className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-purple-400"
//               placeholder="you@example.com"
//               required
//             />
//           </div>

//           {error && (
//             <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
//               {error}
//             </div>
//           )}

//           {message && (
//             <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
//               {message}
//             </div>
//           )}

//           {devResetUrl && (
//             <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 break-all">
//               Development reset link:{" "}
//               <a href={devResetUrl} className="underline">
//                 {devResetUrl}
//               </a>
//             </div>
//           )}

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold uppercase tracking-widest hover:bg-purple-500 disabled:opacity-60"
//           >
//             {loading ? "Submitting..." : "Send Reset Link"}
//           </button>
//         </form>

//         <p className="mt-6 text-xs text-slate-400 text-center">
//           Remembered your password?{" "}
//           <Link
//             href="/auth/login"
//             className="text-amber-400 font-semibold hover:text-amber-300"
//           >
//             Back to login
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// }
