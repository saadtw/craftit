"use client";

import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default function AdminDashboard() {
  const router = useRouter();
  const manufacturersVerification = async () => {
    router.push("/admin/manufacturers");
  };
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <br />
      <button onClick={manufacturersVerification}>
        Manufacturers Verification
      </button>
      <LogoutButton />
    </div>
  );
}
