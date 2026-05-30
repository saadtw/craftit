"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetPasswordRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/setup-password");
  }, [router]);

  return null;
}
