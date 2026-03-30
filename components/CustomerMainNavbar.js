"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const PRIMARY_LINKS = [
  { href: "/customer", label: "Home" },
  { href: "/customer/explore", label: "Products" },
  { href: "/customer/group-buys", label: "Group Buys" },
  { href: "/manufacturers", label: "Manufacturers" },
  { href: "/customer/custom-orders", label: "Custom Orders" },
];

function isActive(pathname, href) {
  if (href === "/customer") return pathname === "/customer";
  return pathname.startsWith(href);
}

export default function CustomerMainNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/customer" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#eb9728] text-white flex items-center justify-center font-black">
              C
            </div>
            <span className="font-black tracking-tight text-gray-900">
              Craftit
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(pathname, link.href)
                    ? "text-[#eb9728]"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/customer/dashboard"
            className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg text-gray-700 hover:border-[#eb9728] hover:text-[#eb9728]"
          >
            Dashboard
          </Link>
          <Link
            href="/custom-orders/new"
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-bold bg-[#eb9728] text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Request
          </Link>
          <Link
            href="/customer/settings"
            className="w-9 h-9 rounded-full bg-[#eb9728] text-white flex items-center justify-center font-bold text-sm"
            title="Profile"
          >
            {initials}
          </Link>
        </div>
      </div>

      <div className="lg:hidden px-4 sm:px-6 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isActive(pathname, link.href)
                  ? "bg-[#eb9728] text-white border-[#eb9728]"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
