// app/auth/reset-password/[token]/page.js
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to reset password");
      }

      setMessage(data.message || "Password has been reset.");
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (requestError) {
      setError(requestError.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md">
        {/* Card */}
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 pr-16 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors"
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
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
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 pr-16 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors"
                  placeholder="Repeat your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wide text-[#eb9728]/60 hover:text-[#eb9728] transition-colors"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="material-symbols-outlined text-base shrink-0">
                  error
                </span>
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <span className="material-symbols-outlined text-base shrink-0">
                  check_circle
                </span>
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
                  <span className="material-symbols-outlined text-[16px]">
                    lock_reset
                  </span>
                  Reset Password
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
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

// // app/auth/reset-password/[token]/page.js
// "use client";

// import { useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Link from "next/link";

// export default function ResetPasswordPage() {
//   const { token } = useParams();
//   const router = useRouter();

//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [message, setMessage] = useState("");

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setError("");
//     setMessage("");

//     if (password.length < 8) {
//       setError("Password must be at least 8 characters.");
//       return;
//     }

//     if (password !== confirmPassword) {
//       setError("Passwords do not match.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await fetch("/api/auth/reset-password", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ token, password, confirmPassword }),
//       });

//       const data = await response.json();
//       if (!response.ok || !data.success) {
//         throw new Error(data.message || "Unable to reset password");
//       }

//       setMessage(data.message || "Password has been reset.");
//       setTimeout(() => router.push("/auth/login"), 1500);
//     } catch (requestError) {
//       setError(requestError.message || "Unable to reset password");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#0B011D] flex items-center justify-center px-4 py-10 text-white">
//       <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
//         <h1 className="text-2xl font-black tracking-tight">Set New Password</h1>
//         <p className="mt-2 text-sm text-slate-300">
//           Choose a strong password with at least 8 characters.
//         </p>

//         <form onSubmit={handleSubmit} className="mt-6 space-y-4">
//           <div>
//             <label className="block text-xs uppercase tracking-widest text-slate-400 mb-1">
//               New Password
//             </label>
//             <div className="relative">
//               <input
//                 type={showPassword ? "text" : "password"}
//                 value={password}
//                 onChange={(event) => setPassword(event.target.value)}
//                 className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-16 text-sm outline-none focus:border-purple-400"
//                 placeholder="At least 8 characters"
//                 required
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword((prev) => !prev)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-purple-300"
//               >
//                 {showPassword ? "Hide" : "Show"}
//               </button>
//             </div>
//           </div>

//           <div>
//             <label className="block text-xs uppercase tracking-widest text-slate-400 mb-1">
//               Confirm Password
//             </label>
//             <div className="relative">
//               <input
//                 type={showConfirmPassword ? "text" : "password"}
//                 value={confirmPassword}
//                 onChange={(event) => setConfirmPassword(event.target.value)}
//                 className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-16 text-sm outline-none focus:border-purple-400"
//                 placeholder="Repeat your password"
//                 required
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowConfirmPassword((prev) => !prev)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-purple-300"
//               >
//                 {showConfirmPassword ? "Hide" : "Show"}
//               </button>
//             </div>
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

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold uppercase tracking-widest hover:bg-purple-500 disabled:opacity-60"
//           >
//             {loading ? "Updating..." : "Reset Password"}
//           </button>
//         </form>

//         <p className="mt-6 text-xs text-slate-400 text-center">
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
