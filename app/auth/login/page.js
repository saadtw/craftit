// app/auth/login/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import googleLogo from "@/assets/google.png";
import smartMatch from "@/assets/smartmatch.png";
import orderIcon from "@/assets/order.png";
import bidIcon from "@/assets/bid.png";
import groupBuyIcon from "@/assets/groupbuy.png";
import manufactureIcon from "@/assets/manufacture.png";
import uploadIcon from "@/assets/upload.png";
import matchIcon from "@/assets/match.png";
import previewIcon from "@/assets/preview.png";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const hasRedirected = useRef(false);

  // Redirect if already logged in
  useEffect(() => {
    if (hasRedirected.current) return; // Prevent multiple redirects

    if (status === "authenticated" && session?.user?.role) {
      console.log("Session authenticated, redirecting...", session.user.role);
      hasRedirected.current = true;

      const role = session.user.role;
      if (role === "customer") {
        router.replace("/customer");
      } else if (role === "manufacturer") {
        router.replace("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.replace("/admin/dashboard");
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
        twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
        redirect: false,
      });

      if (result.error) {
        if (result.error === "TWO_FACTOR_REQUIRED") {
          setRequiresTwoFactor(true);
          setError("A 2FA code was sent to your email. Enter it to continue.");
        } else if (result.error === "INVALID_TWO_FACTOR_CODE") {
          setRequiresTwoFactor(true);
          setError("Invalid or expired 2FA code. Please try again.");
        } else if (result.error === "EMAIL_NOT_VERIFIED") {
          setError("Please verify your email before logging in.");
        } else if (result.error?.startsWith("OAUTH_ACCOUNT_ONLY")) {
          const provider = result.error.split(":")[1] || "Google";
          setError(
            `This account uses ${provider} for login. Please sign in with ${provider} instead.`,
          );
        } else {
          setError(result.error);
        }
      } else {
        // Successful login - redirect directly
        console.log("Login successful, redirecting...");

        // Give auth cookie time to set, then redirect
        setTimeout(() => {
          // Fetch session to get role
          fetch("/api/auth/session")
            .then((res) => res.json())
            .then((data) => {
              console.log("Session after login:", data);
              const role = data?.user?.role || "customer";

              if (role === "customer") {
                router.replace("/customer");
              } else if (role === "manufacturer") {
                router.replace("/manufacturer/dashboard");
              } else if (role === "admin") {
                router.replace("/admin/dashboard");
              } else {
                router.replace("/customer");
              }
            })
            .catch((err) => {
              console.error("Failed to fetch session:", err);
              router.replace("/customer");
            });
        }, 500);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0B011D] p-4 overflow-hidden font-sans relative">
      <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-amber-600/10 blur-[100px]" />

      <Link 
        href="/?noRedirect=true" 
        className="absolute top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-purple-400 transition-all group"
      >
        <div className="w-6 h-6 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
          <span className="material-symbols-outlined text-white text-[9px]">arrow_back</span>
        </div>
        Back to Home
      </Link>

      <div className="relative flex h-[540px] w-full max-w-3xl overflow-hidden rounded-[30px] border border-purple-500/30 bg-white/2 backdrop-blur-3xl z-10 text-white shadow-[0_0_50px_rgba(168,85,247,0.15)]">
        <div className="flex w-full flex-col justify-center px-10 md:w-[60%] lg:px-14 order-1 border-r border-white/5 bg-[#0B011D]/30">
          <div className="mb-6">
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.3em]">
              Craftit
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1 leading-none">
              Hello!
            </h1>
            <h2 className="text-xl font-bold opacity-80 mt-1">Welcome Back</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 max-w-[280px]">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block ml-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter email"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs outline-none focus:border-purple-500 transition-all placeholder:text-slate-600"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="relative">
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 pr-16 text-xs outline-none focus:border-purple-500 transition-all placeholder:text-slate-600"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-purple-300 hover:text-purple-200"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <Link
                href="/auth/forgot-password"
                className="mt-1 block text-right text-[9px] font-semibold text-purple-400 hover:text-purple-300"
              >
                Forgot?
              </Link>
            </div>

            {requiresTwoFactor && (
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block ml-1">
                  2FA Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs outline-none focus:border-purple-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-[9px] text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:bg-purple-500 active:scale-[0.98] tracking-widest uppercase"
            >
              {loading ? "..." : "LOGIN"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 max-w-[280px] opacity-20">
            <div className="h-px flex-1 bg-white" />
            <span className="text-[9px] font-bold">OR</span>
            <div className="h-px flex-1 bg-white" />
          </div>

          <div className="flex gap-2.5 max-w-[280px]">
            <button
              type="button"
              onClick={() => signIn("google")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 hover:bg-white/10 transition-all group"
            >
              <Image src={googleLogo} alt="G" width={16} height={16} />
              <span className="text-[10px] font-bold">Google</span>
            </button>
          </div>

          <p className="mt-6 text-[10px] text-slate-500 max-w-[280px] text-center">
            Dont have account?{" "}
            <Link href="/auth/signup" className="font-bold text-amber-500">
              Register
            </Link>
          </p>
        </div>

        <div className="hidden w-[40%] md:block relative overflow-hidden order-2 border-l border-white/5 bg-white/1">
          <div className="absolute inset-0 opacity-200 scale-[0.8]">
            <div className="absolute top-[-10%] left-[-5%] ">
              <Image src={uploadIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[10%] left-[-10%] ">
              <Image src={smartMatch} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[1%] left-[20%] ">
              <Image src={previewIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[-16%] left-[25%] ">
              <Image src={orderIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[20%] left-[18%] ">
              <Image src={matchIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[30%] left-[-8%] ">
              <Image src={manufactureIcon} width={55} height={55} alt="i" />
            </div>
            <div className="absolute top-[50%] left-[-10%] ">
              <Image src={groupBuyIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute bottom-[50%] left-[25%] ">
              <Image src={bidIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[10%] right-[-15%] ">
              <Image src={groupBuyIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[30%] right-[30%] ">
              <Image src={uploadIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[13%] right-[40%] ">
              <Image src={previewIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[2%] right-[10%] ">
              <Image src={smartMatch} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[-8%] right-[35%] ">
              <Image src={orderIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[-17%] right-[10%] ">
              <Image src={previewIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[-11%] right-[-15%] ">
              <Image src={matchIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[20%] right-[5%] ">
              <Image src={manufactureIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[70%] left-[-10%] ">
              <Image src={groupBuyIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[60%] left-[20%] ">
              <Image src={uploadIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[50%] right-[30%] ">
              <Image src={smartMatch} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[40%] right-[5%] ">
              <Image src={manufactureIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[30%] right-[-18%] ">
              <Image src={matchIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[88%] left-[-10%] ">
              <Image src={orderIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[78%] left-[20%] ">
              <Image src={bidIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[68%] right-[30%] ">
              <Image src={matchIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[58%] right-[5%] ">
              <Image src={manufactureIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[48%] right-[-18%] ">
              <Image src={uploadIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[105%] left-[-10%] ">
              <Image src={orderIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[95%] left-[20%] ">
              <Image src={smartMatch} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[85%] right-[30%] ">
              <Image src={uploadIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[75%] right-[5%] ">
              <Image src={groupBuyIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[65%] right-[-18%] ">
              <Image src={bidIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[109%] left-[20%] ">
              <Image src={manufactureIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[99%] right-[30%] ">
              <Image src={matchIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[90%] right-[5%] ">
              <Image src={orderIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[80%] right-[-18%] ">
              <Image src={previewIcon} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[108%] right-[10%] ">
              <Image src={smartMatch} width={50} height={50} alt="i" />
            </div>
            <div className="absolute top-[98%] right-[-15%] ">
              <Image src={uploadIcon} width={50} height={50} alt="i" />
            </div>
          </div>
          <div className="absolute inset-0 bg-linear-to-l from-transparent via-transparent to-[#0B011D]/80" />
        </div>
      </div>
    </div>
  );
}
