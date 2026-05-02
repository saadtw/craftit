"use client";

import dynamic from "next/dynamic";
import LoadingAnimationData from "@/assets/Loading.json";
import { cn } from "@/lib/utils";

// Dynamically import Lottie to avoid SSR hydration issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function GlobalLoader({ 
  text = "Loading...", 
  fullScreen = false,
  className 
}) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-5", className)}>
      <div className="w-48 h-48 drop-shadow-[0_0_25px_rgba(235,151,40,0.6)] brightness-150 contrast-125">
        <Lottie animationData={LoadingAnimationData} loop={true} />
      </div>
      {text && (
        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em] animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-transparent">
        {content}
      </div>
    );
  }

  // Fallback for smaller/inline loading states
  return (
    <div className="w-full py-16 flex items-center justify-center bg-transparent">
      {content}
    </div>
  );
}
