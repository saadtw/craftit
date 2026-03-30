// app/customer/CustomerShell.js
"use client";

import { usePathname } from "next/navigation";
import CustomerSidebar from "@/components/CustomerSidebar";
import CustomerLayoutContext from "./CustomerLayoutContext";

export default function CustomerShell({ children }) {
  const pathname = usePathname();

  // Keep the standalone customer home page unchanged.
  if (pathname === "/customer") {
    return children;
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f6]">
      <CustomerSidebar />
      <div className="flex-1 min-w-0">
        <CustomerLayoutContext.Provider value={true}>
          {children}
        </CustomerLayoutContext.Provider>
      </div>
    </div>
  );
}
