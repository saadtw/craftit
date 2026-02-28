"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={
        "flex items-center gap-3 px-4 py-2 rounded-lg text-gray-900 hover:bg-[#eb9728]/10 w-full"
      }
    >
      <span className="material-symbols-outlined">logout</span>
      <span className="font-medium">Logout</span>
    </button>
  );
}
