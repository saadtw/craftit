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
            {/* Status message */}
            {status === "loading" && (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin shrink-0" />
                <p className="text-sm text-white/50">{message}</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <span className="material-symbols-outlined text-base shrink-0">
                  check_circle
                </span>
                {message}
              </div>
            )}

            {status === "error" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="material-symbols-outlined text-base shrink-0">
                  error
                </span>
                {message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Link
                href="/auth/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-black hover:bg-[#d4871f] transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  login
                </span>
                Go to Login
              </Link>
              <Link
                href="/auth/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  lock_reset
                </span>
                Forgot Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-10 text-white">
          <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-white/8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-2">
                Account
              </p>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Email Verification
              </h1>
            </div>
            <div className="px-8 py-6 flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin shrink-0" />
              <p className="text-sm text-white/50">Verifying your email...</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
// "use client";

// import { Suspense, useEffect, useMemo, useState } from "react";
// import { useSearchParams } from "next/navigation";
// import Link from "next/link";

// function VerifyEmailContent() {
//   const searchParams = useSearchParams();
//   const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

//   const [status, setStatus] = useState("loading");
//   const [message, setMessage] = useState("Verifying your email...");

//   useEffect(() => {
//     async function verifyEmail() {
//       if (!token) {
//         setStatus("error");
//         setMessage("Verification token missing.");
//         return;
//       }

//       try {
//         const response = await fetch("/api/auth/verify-email", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ token }),
//         });

//         const data = await response.json();
//         if (!response.ok || !data.success) {
//           throw new Error(data.message || "Unable to verify email");
//         }

//         setStatus("success");
//         setMessage(data.message || "Email verified successfully.");
//       } catch (error) {
//         setStatus("error");
//         setMessage(error.message || "Verification failed.");
//       }
//     }

//     verifyEmail();
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-[#0B011D] flex items-center justify-center px-4 py-10 text-white">
//       <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
//         <h1 className="text-2xl font-black tracking-tight">
//           Email Verification
//         </h1>
//         <p
//           className={`mt-4 text-sm ${
//             status === "success"
//               ? "text-emerald-300"
//               : status === "error"
//                 ? "text-red-300"
//                 : "text-slate-300"
//           }`}
//         >
//           {message}
//         </p>

//         <div className="mt-6 flex flex-col gap-2">
//           <Link
//             href="/auth/login"
//             className="w-full rounded-xl bg-purple-600 py-3 text-center text-sm font-bold uppercase tracking-widest hover:bg-purple-500"
//           >
//             Go to login
//           </Link>
//           <Link
//             href="/auth/forgot-password"
//             className="w-full rounded-xl border border-white/20 py-3 text-center text-sm font-bold uppercase tracking-widest hover:bg-white/10"
//           >
//             Forgot password
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function VerifyEmailPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="min-h-screen bg-[#0B011D] flex items-center justify-center px-4 py-10 text-white">
//           <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
//             <h1 className="text-2xl font-black tracking-tight">
//               Email Verification
//             </h1>
//             <p className="mt-4 text-sm text-slate-300">
//               Verifying your email...
//             </p>
//           </div>
//         </div>
//       }
//     >
//       <VerifyEmailContent />
//     </Suspense>
//   );
// }
