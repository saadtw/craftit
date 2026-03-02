"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "customer") {
        router.push("/customer/dashboard");
      } else if (role === "manufacturer") {
        router.push("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  }, [status, session, router]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="h-12 w-12 text-amber-600"
              fill="none"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
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

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Join Craftit
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Select your account type to get started
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/auth/signup/customer">
            <div className="group cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-amber-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <span className="text-2xl">👤</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    Sign Up as Customer
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Get custom products manufactured
                  </p>
                </div>
                <svg
                  className="h-6 w-6 text-slate-400 group-hover:text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </Link>

          <Link href="/auth/signup/manufacturer">
            <div className="group cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-amber-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <span className="text-2xl">🏭</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    Sign Up as Manufacturer
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Offer your manufacturing services
                  </p>
                </div>
                <svg
                  className="h-6 w-6 text-slate-400 group-hover:text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              className="font-medium text-amber-600 hover:text-amber-700"
              href="/auth/login"
            >
              Log in
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
