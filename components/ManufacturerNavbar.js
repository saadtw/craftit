"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Logo from "@/components/CrafitLogo";
import Image from "next/image";

// ASSETS
import NotificationIcon from "@/assets/notification.png";
import DashboardIcon from "@/assets/Dashboard.png";
import SettingsIcon from "@/assets/settings.png";
import LogoutIcon from "@/assets/logout.png";
import messageIcon from "@/assets/message.png";
import supportIcon from "@/assets/support.png";


export default function ManufacturerNavbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/auth/login" });
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/notifications?unread=true&limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.unreadCount !== undefined) setUnreadNotifs(d.unreadCount);
      })
      .catch(() => {});
  }, [session?.user?.id]);

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

  const displayName = session?.user?.businessName || session?.user?.name || "Manufacturer";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B011D]/70 backdrop-blur-xl">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 h-[74px] flex items-center justify-between gap-8">
        
        {/* LEFT: Logo & Portal Identity */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/manufacturer/dashboard" className="flex items-center gap-3">
            <Logo className="h-9 w-9 text-[#eb9728]" />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter text-white">CRAFTIT</span>
              <span className="text-[10px] font-bold text-[#eb9728] uppercase tracking-[0.2em] mt-0.5">Manufacturer Portal</span>
            </div>
          </Link>
        </div>

        {/* RIGHT: Action Buttons & Profile */}
        <div className="flex items-center gap-4 shrink-0 ml-auto">

          {/* Messages Button */}
          <Link
            href="/manufacturer/messages"
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm font-bold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all group"
          >
            <div className="relative">
              <Image src={messageIcon} alt="" width={22} height={22} className="opacity-60 group-hover:opacity-100" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#eb9728] rounded-full animate-pulse" />
            </div>
            <span>Messages</span>
          </Link>

          {/* Notifications Button */}
          <Link
            href="/manufacturer/notifications"
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm font-bold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all group"
          >
            <div className="relative">
              <Image src={NotificationIcon} alt="" width={22} height={22} className="opacity-60 group-hover:opacity-100" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-purple-600 text-[10px] font-black text-white rounded-full flex items-center justify-center border-2 border-[#0B011D]">
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </Link>

          {/* Vertical Divider */}
          <div className="hidden sm:block w-px h-8 bg-white/10 mx-1" />

          {/* Profile Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => status === "authenticated" && setIsProfileOpen(!isProfileOpen)}
              disabled={status === "loading"}
              className={`w-[50px] h-[50px] rounded-full p-[2.5px] transition-all ${
                status === "loading"
                  ? "bg-white/10 animate-pulse"
                  : "bg-gradient-to-tr from-[#eb9728] to-purple-600 active:scale-95 focus:outline-none"
              }`}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#eb9728] border-[2.5px] border-[#0B011D] font-black text-sm text-white hover:bg-amber-600 transition-colors">
                {status === "loading" ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  initials || "M"
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-16 p-[1.5px] bg-gradient-to-tr from-[#eb9728] to-purple-600 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-64 bg-[#0a0a0c] rounded-[calc(1.5rem-1.5px)] py-3 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 mb-2">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Authenticated As</p>
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] font-medium text-[#eb9728] mt-1">Verified Manufacturer</p>
                  </div>

                  {[
                    { href: "/manufacturer/dashboard", icon: DashboardIcon, label: "Dashboard" },
                    { href: "/manufacturer/settings", icon: SettingsIcon, label: "Account Settings" },
                    { href: "/manufacturer/support", icon: supportIcon, label: "Help & Support" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Image src={item.icon} alt="" width={20} height={20} className="opacity-50" />
                      <span className="font-semibold">{item.label}</span>
                    </Link>
                  ))}

                  <div className="h-[1px] bg-white/5 my-2 mx-3" />

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-3 px-5 py-3 text-sm w-full text-left hover:bg-red-500/10 transition-colors group"
                  >
                    <Image src={LogoutIcon} alt="" width={20} height={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-red-400 font-bold">
                      {loggingOut ? "Signing out..." : "Sign Out"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
