"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function PendingVerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (
      status === "authenticated" &&
      session?.user?.verificationStatus === "approved"
    ) {
      router.push("/manufacturer/dashboard");
    }
  }, [status, session, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="h-12 w-12 text-amber-600"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M4.177,14.686,21.5,4.2a3,3,0,0,1,3,0l17.323,10.485a3,3,0,0,1,1.5,2.6V30.714a3,3,0,0,1-1.5,2.6L24.5,43.8a3,3,0,0,1-3,0L4.177,33.314a3,3,0,0,1-1.5-2.6V17.286a3,3,0,0,1,1.5-2.6Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d="m22.5,24,14.5-8.5M22.5,24V43.5M22.5,24,9,16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            </svg>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Craftit
            </span>
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-yellow-100 p-4 dark:bg-yellow-900/20">
              <svg
                className="h-12 w-12 text-yellow-600 dark:text-yellow-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
            Verification Pending
          </h1>

          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Thank you for registering as a manufacturer! Your account is
            currently under review by our admin team. You will receive an email
            notification once your account has been verified.
          </p>

          <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
              What happens next?
            </h3>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 text-left">
              <li>• Our team will review your submitted documents</li>
              <li>• Verification typically takes 1-3 business days</li>
              <li>• You&apos;ll receive an email once approved</li>
              <li>
                • After approval, you can access all manufacturer features
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-medium"
            >
              Back to Login
            </Link>
            <Link
              href="/"
              className="block w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors font-medium text-slate-900 dark:text-slate-50"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
