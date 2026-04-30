"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import LogoutIcon from "@/assets/logout.png";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    setLoading(true);
    signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`group flex flex-col items-center gap-1.5 px-2 py-3 w-full border-l-2 border-l-transparent hover:border-l-white/40 transition-all ${className}`}
    >
      <Image src={LogoutIcon} alt="Logout" width={30} height={30} />
      <span className="text-[11px] font-semibold text-center leading-tight text-white/70 group-hover:text-white transition-colors">
        {loading ? "..." : "Logout"}
      </span>
    </button>
  );
}
