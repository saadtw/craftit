"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const B2B_PREFIXES = [
  "/customer",
  "/manufacturer",
  "/manufacturers",
  "/custom-orders",
  "/bids",
  "/auth",
];

function skinForPathname(pathname) {
  if (!pathname) return "marketing";
  if (pathname.startsWith("/admin")) return "admin";
  if (B2B_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "b2b";
  }
  if (pathname === "/") return "marketing";
  return "marketing";
}

export default function ScrollSkin() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const skin = skinForPathname(pathname);
    document.documentElement.dataset.scrollSkin = skin;
  }, [pathname]);

  return null;
}
