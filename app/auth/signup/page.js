// app/auth/signup/page.js
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Logo from "@/components/CrafitLogo";
import leftArrow from "@/assets/backArrow.png";
import buyerImg from "@/assets/Buyer.png";
import sellerImg from "@/assets/Seller.png";

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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#060111] p-4 md:p-8 font-sans relative overflow-hidden text-white">
      <div className="absolute left-[-18%] top-[2%] w-[650px] h-[650px] z-1 pointer-events-none opacity-30 hidden lg:block transition-all duration-700">
        <Image
          src={buyerImg}
          alt="Buyer"
          fill
          sizes="(min-width: 1024px) 650px, 0px"
          loading="eager"
          className="object-contain"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#060111] via-transparent to-transparent opacity-80" />
      </div>

      <div className="absolute right-[-25%] bottom-[3%] w-[650px] h-[650px] z-1 pointer-events-none opacity-20 hidden lg:block transition-all duration-700">
        <Image
          src={sellerImg}
          alt="Seller"
          fill
          sizes="(min-width: 1024px) 650px, 0px"
          loading="eager"
          className="object-contain"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-l from-[#060111] via-transparent to-transparent opacity-80" />
      </div>

      <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px] z-1" />

      <Link
        href="/"
        className="absolute top-4 left-6 md:top-6 md:left-10 z-50 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 hover:text-purple-400 transition-all group"
      >
        <div className="relative w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300">
          <Image
            src={leftArrow}
            alt="back"
            fill
            sizes="16px"
            className="object-contain opacity-70 group-hover:opacity-100"
          />
        </div>
        Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-4xl py-12">
        <div className="text-center mb-4 flex flex-col items-center">
          <div className="mb-2 animate-fade-in">
            <Logo className="h-9 w-9 text-amber-600 opacity-90" />
          </div>

          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.4em] mb-1 block">
            Craftit
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter italic uppercase leading-tight text-white">
            Join{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-indigo-400">
              Craftit
            </span>
          </h1>
          <p className="text-slate-400 text-[10px] md:text-xs font-medium mt-1 opacity-80">
            Select your workspace to begin production.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Link href="/auth/signup/customer" className="group">
            <div className="h-full min-h-[350px] relative overflow-hidden rounded-4xl border border-white/5 bg-white/2 backdrop-blur-3xl p-8 flex flex-col items-center text-center transition-all duration-500 hover:border-purple-500/50 hover:bg-white/4 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]">
              <div className="mb-6 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative w-24 h-24 group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src={buyerImg}
                    alt="Customer Icon"
                    fill
                    sizes="96px"
                    className="object-contain"
                  />
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 tracking-tight">
                I am a Customer
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-6 px-4 opacity-70">
                I want to upload designs, get instant quotes, and manage my
                custom projects.
              </p>
              <div className="mt-auto w-full py-3 rounded-xl bg-purple-600 text-[9px] font-black tracking-widest uppercase shadow-[0_10px_20px_rgba(147,51,234,0.3)]">
                Create Client Account
              </div>
            </div>
          </Link>

          <Link href="/auth/signup/manufacturer" className="group">
            <div className="h-full min-h-[350px] relative overflow-hidden rounded-4xl border border-white/5 bg-white/2 backdrop-blur-3xl p-8 flex flex-col items-center text-center transition-all duration-500 hover:border-purple-500/50 hover:bg-white/4 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]">
              <div className="mb-6 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative w-24 h-24 group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src={sellerImg}
                    alt="Manufacturer Icon"
                    fill
                    sizes="96px"
                    className="object-contain text-white"
                  />
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 tracking-tight">
                I am a Manufacturer
              </h3>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-6 px-4 opacity-70">
                I want to list my facilities, bid on requests, and grow my
                business.
              </p>
              <div className="mt-auto w-full py-3 rounded-xl bg-purple-600 text-[9px] font-black tracking-widest uppercase shadow-[0_10px_20px_rgba(147,51,234,0.3)]">
                Join as Partner
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[13px] text-slate-500">
            Already have an account?
            <Link
              href="/auth/login"
              className="font-bold text-amber-500 hover:text-amber-400 ml-1"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
