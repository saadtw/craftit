"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Logo from "@/components/CrafitLogo";
import Image from "next/image";
import customOrderIcon from "@/assets/CustomOrderIcon.png";

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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B011D]/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[74px] flex items-center justify-between relative">
        {/* LEFT LOGO */}
        <div className="z-10 flex items-center">
          <Link href="/customer" className="flex items-center gap-3">
            <Logo className="h-9 w-9 text-[#D5662A]" />
            <span className="text-xl font-black tracking-tight text-white">
              Craftit
            </span>
          </Link>
        </div>

        {/* CENTER NAV */}
        <nav className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {PRIMARY_LINKS.map((link) => {
            const active = isActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-2 text-sm font-bold transition-colors ${
                  active ? "text-white" : "text-[#8F82A8] hover:text-white"
                }`}
              >
                {link.label}

                {active && (
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-[3px] w-8 rounded-full bg-[#D5662A]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="z-10 flex items-center gap-2">
          <Link
            href="/custom-orders/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white hover:border-[#eb9728] transition-all"
          >
            <Image
              src={customOrderIcon}
              alt="Custom Order"
              width={20}
              height={20}
              className="opacity-70 group-hover:opacity-100 transition"
            />
            Custom Order
          </Link>

          <Link
            href="/customer/settings"
            className="h-11 w-11 rounded-full bg-[#D5662A] text-white flex items-center justify-center font-black text-sm hover:bg-[#e87532] transition-colors"
            title="Profile"
          >
            {initials}
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="h-11 w-11 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-lg hover:bg-red-600/30 hover:text-red-300 transition-all border border-red-600/30 hover:border-red-600/50"
            title="Logout"
          >
            ⎋
          </button>
        </div>
      </div>

      {/* MOBILE NAV */}
      <div className="lg:hidden px-4 sm:px-6 pb-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {PRIMARY_LINKS.map((link) => {
            const active = isActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? "bg-[#3E1A9F] text-white border-[#5B42BC]"
                    : "bg-[#2B203B] text-[#8F82A8] border-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
