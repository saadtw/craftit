"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className}
      style={{
        padding: "10px 20px",
        backgroundColor: loading ? "#ccc" : "#dc2626",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: "500",
      }}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
