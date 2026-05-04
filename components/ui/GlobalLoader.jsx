"use client";

import dynamic from "next/dynamic";
import LoadingAnimationData from "@/assets/Loading.json";
import { cn } from "@/lib/utils";

// Dynamically import Lottie to avoid SSR hydration issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function GlobalLoader({ 
  text = "LOADING...", 
  fullScreen = false,
  className 
}) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      <div className="w-56 h-56 relative">
        {/* Subtle glow background */}
        <div className="absolute inset-0 bg-[#eb9728]/10 blur-[60px] rounded-full animate-pulse" />
        <div className="relative drop-shadow-[0_0_30px_rgba(235,151,40,0.4)] brightness-125">
          <Lottie animationData={LoadingAnimationData} loop={true} />
        </div>
      </div>
      {text && (
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050507] transition-all duration-500">
        {content}
      </div>
    );
  }

  // Inline fallback
  return (
    <div className="w-full py-24 flex items-center justify-center bg-transparent">
      {content}
    </div>
  );
}
