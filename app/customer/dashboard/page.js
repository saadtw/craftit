"use client";

import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default function CustomerDashboard() {
  const router = useRouter();
  const createCustomOrder = () => {
    router.push("/custom-orders/new");
  };
  return (
    <div>
      <h1>Customer Dashboard</h1>
      <br />
      <button onClick={createCustomOrder}>Create a Custom Order</button>
      <LogoutButton />
    </div>
  );
}
