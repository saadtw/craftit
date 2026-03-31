"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import LogoutButton from "@/components/LogoutButton";

function CraftitLogo() {
  return (
    <svg
      className="h-7 w-7 text-amber-600"
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.177,14.686,21.5,4.2a3,3,0,0,1,3,0l17.323,10.485a3,3,0,0,1,1.5,2.6V30.714a3,3,0,0,1-1.5,2.6L24.5,43.8a3,3,0,0,1-3,0L4.177,33.314a3,3,0,0,1-1.5-2.6V17.286a3,3,0,0,1,1.5-2.6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="m22.5,24,14.5-8.5M22.5,24V43.5M22.5,24,9,16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/manufacturer/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/manufacturer/products", label: "Products", key: "products" },
  { href: "/manufacturer/orders", label: "Orders", key: "orders" },
  { href: "/manufacturer/rfqs", label: "RFQs", key: "rfqs" },
  { href: "/manufacturer/bids", label: "My Bids", key: "bids" },
  { href: "/manufacturer/group-buys", label: "Group Buys", key: "group-buys" },
  { href: "/manufacturer/messages", label: "Messages", key: "messages" },
  { href: "/manufacturer/support", label: "Support", key: "support" },
  { href: "/manufacturer/disputes", label: "Disputes", key: "disputes" },
  { href: "/manufacturer/financial", label: "Financials", key: "financial" },
  { href: "/manufacturer/analytics", label: "Analytics", key: "analytics" },
  { href: "/manufacturer/settings", label: "Settings", key: "settings" },
];

export default function ManufacturerNav({ session }) {
  const pathname = usePathname();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;

  const displayName =
    activeSession?.user?.businessName ||
    activeSession?.user?.name ||
    "Manufacturer";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userId = activeSession?.user?.id;

  useEffect(() => {
    if (!userId) return;
    fetch("/api/notifications?unread=true&limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.unreadCount !== undefined) setUnreadNotifs(d.unreadCount);
      })
      .catch(() => {});
  }, [userId]);

  const isActive = (item) => {
    if (item.href === "/manufacturer/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-3 flex justify-between items-center">
          {/* Left: Logo + desktop nav */}
          <div className="flex items-center gap-6">
            <Link
              href="/manufacturer/dashboard"
              className="flex items-center gap-2 shrink-0"
            >
              <CraftitLogo />
              <span className="text-lg font-extrabold text-blue-900">
                Craftit
              </span>
            </Link>
            <nav className="hidden xl:flex items-center gap-1 flex-wrap">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item)
                      ? "bg-orange-50 text-orange-600 font-bold"
                      : "text-gray-600 hover:text-orange-500 hover:bg-orange-50/50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: notifications + avatar + logout */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <Link
              href="/manufacturer/notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-xl text-gray-600">
                notifications
              </span>
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </Link>

            {/* Avatar → settings */}
            <Link
              href="/manufacturer/settings"
              className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold text-sm hover:bg-blue-800 transition-colors"
              title="Settings"
            >
              {initials}
            </Link>

            <LogoutButton />

            {/* Mobile menu toggle */}
            <button
              className="xl:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="material-symbols-outlined text-xl text-gray-600">
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="xl:hidden border-t border-gray-100 bg-white px-4 py-3 grid grid-cols-3 gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 rounded-lg text-xs font-medium text-center transition-colors ${
                  isActive(item)
                    ? "bg-orange-50 text-orange-600 font-bold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
