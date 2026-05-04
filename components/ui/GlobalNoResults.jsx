"use client";

import dynamic from "next/dynamic";
import NotFoundAnimationData from "@/assets/NotFound.json";
import { cn } from "@/lib/utils";

// Dynamically import Lottie to avoid SSR hydration issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function GlobalNoResults({ className, text }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="w-48 h-48 opacity-80 drop-shadow-[0_0_15px_rgba(168,85,247,0.2)]">
        <Lottie animationData={NotFoundAnimationData} loop={true} />
      </div>
      {text && (
        <p className="mt-4 text-slate-400 text-sm font-semibold tracking-wide">
          {text}
        </p>
      )}
    </div>
  );
}
