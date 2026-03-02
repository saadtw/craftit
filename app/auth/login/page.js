"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result.error) {
        setError(result.error);
      } else {
        const response = await fetch("/api/auth/session");
        const session = await response.json();

        if (session?.user) {
          const user = session.user;

          if (user.role === "customer") {
            router.push("/customer/dashboard");
          } else if (user.role === "manufacturer") {
            router.push("/manufacturer/dashboard");
          } else if (user.role === "admin") {
            router.push("/admin/dashboard");
          }
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-transparent">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-900 dark:text-slate-50"
            >
              <svg
                className="h-8 w-8 text-amber-600"
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
              <span className="text-xl font-bold">Craftit</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Welcome Back
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Please login to your account.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  className="text-sm font-medium text-slate-500 dark:text-slate-400"
                  htmlFor="email"
                >
                  Email or Username
                </label>
                <div className="relative mt-2">
                  <input
                    className="w-full rounded-md border-slate-200 bg-slate-100 py-3 px-4 text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:ring-amber-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder-slate-500"
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  className="text-sm font-medium text-slate-500 dark:text-slate-400"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    className="w-full rounded-md border-slate-200 bg-slate-100 py-3 px-4 text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:ring-amber-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder-slate-500"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    className="h-4 w-4 rounded border-slate-200 text-amber-600 focus:ring-amber-600 dark:border-slate-700"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) =>
                      setFormData({ ...formData, rememberMe: e.target.checked })
                    }
                  />
                  <label
                    className="ml-2 block text-sm text-slate-500 dark:text-slate-400"
                    htmlFor="remember-me"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a
                    className="font-medium text-amber-600 hover:text-amber-700"
                    href="#"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 dark:bg-red-900/20 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <div>
                <button
                  className="flex w-full justify-center rounded-md bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Log in"}
                </button>
              </div>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-950">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="truncate">Google</span>
              </button>
              <button className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-950">
                <svg
                  className="h-5 w-5 text-[#1877F2]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89H8.038v-2.89h2.399v-2.19c0-2.384 1.435-3.69 3.593-3.69 1.03 0 1.913.077 2.17.11V8.5h-1.408c-1.16 0-1.387.55-1.387 1.363v1.766h2.827l-.368 2.89h-2.459v7.039C18.343 21.128 22 16.991 22 12z" />
                </svg>
                <span className="truncate">Facebook</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                className="font-medium text-amber-600 hover:text-amber-700"
                href="/auth/signup"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
