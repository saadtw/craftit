"use client";

import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default function ManufacturerDashboard() {
  const router = useRouter();
  const browseRFQs = () => {
    router.push("/manufacturer/rfqs");
  };

  return (
    <div>
      <h1>Manufacturer Dashboard</h1>
      <br />
      <button onClick={browseRFQs}>Browse RFQS</button>
      <LogoutButton />
    </div>
  );
}
