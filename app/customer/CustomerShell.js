// app/customer/CustomerShell.js
"use client";

import { usePathname } from "next/navigation";
import CustomerSidebar from "@/components/CustomerSidebar";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import CustomerLayoutContext from "./CustomerLayoutContext";

export default function CustomerShell({ children }) {
  const pathname = usePathname();

  const isMarketplaceRoute =
    pathname === "/customer" ||
    pathname.startsWith("/customer/explore") ||
    pathname.startsWith("/customer/group-buys") ||
    pathname.startsWith("/customer/products");

  return (
    <div className="min-h-screen bg-[#f8f7f6]">
      <CustomerMainNavbar />
      <div className="flex min-h-[calc(100vh-73px)]">
        {!isMarketplaceRoute && <CustomerSidebar />}
        <div className="flex-1 min-w-0">
          <CustomerLayoutContext.Provider value={true}>
            {children}
          </CustomerLayoutContext.Provider>
        </div>
      </div>
    </div>
  );
}
