"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Logo from "@/components/CrafitLogo";
import Image from "next/image";

// ASSETS
import customOrderIcon from "@/assets/CustomOrderIcon.png";
import NotificationIcon from "@/assets/notification.png";
import DashboardIcon from "@/assets/Dashboard.png";
import SettingsIcon from "@/assets/settings.png";
import LogoutIcon from "@/assets/logout.png";

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
  // Using status to handle the "U" flicker issue
  const { data: session, status } = useSession();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/auth/login" });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = session?.user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B011D]/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[74px] flex items-center justify-between relative">
        {/* LOGO */}
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
              alt="Custom"
              width={25}
              height={25}
              className="opacity-70"
            />
            Custom Order
          </Link>

          <Link
            href="/customer/notifications"
            className="h-11 w-11 rounded-full bg-white/[0.04] border border-white/10 text-white flex items-center justify-center hover:bg-white/[0.07] hover:border-[#eb9728] transition-colors"
          >
            <Image
              src={NotificationIcon}
              alt="Notifications"
              width={24}
              height={24}
            />
          </Link>

          {/* Profile Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() =>
                status === "authenticated" && setIsProfileOpen(!isProfileOpen)
              }
              disabled={status === "loading"}
              className={`w-[50px] h-[50px] rounded-full p-[2.5px] transition-all ${
                status === "loading"
                  ? "bg-white/10 animate-pulse"
                  : "bg-gradient-to-tr from-[#FFBF00] to-[#800080] active:scale-95 focus:outline-none"
              }`}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#D5662A] border-[2.5px] border-[#0B011D] font-black text-sm text-white hover:bg-[#e87532] transition-colors">
                {status === "loading" ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  initials || "U"
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-14 p-[1.5px] bg-gradient-to-tr from-[#FFBF00] to-[#800080] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-50 animate-in fade-in zoom-in-95 duration-200">
                {/* Inner Container: Isme background color aur content hai */}
                <div className="w-52 bg-[#0a0a0c] rounded-[calc(1rem-1.5px)] py-2 overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/5 mb-1">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      Account
                    </p>
                  </div>

                  <Link
                    href="/customer/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
                  >
                    <Image
                      src={DashboardIcon}
                      alt=""
                      width={20}
                      height={20}
                      className="opacity-70"
                    />
                    Dashboard
                  </Link>

                  <Link
                    href="/customer/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
                  >
                    <Image
                      src={SettingsIcon}
                      alt=""
                      width={20}
                      height={20}
                      className="opacity-70"
                    />
                    Settings
                  </Link>

                  <div className="h-[1px] bg-white/5 my-1 mx-2" />

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left hover:bg-white/5 transition-colors"
                  >
                    <Image src={LogoutIcon} alt="" width={20} height={20} />
                    <span className="text-[#FFBF00] font-bold">
                      {loggingOut ? "Logging out..." : "Logout"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
