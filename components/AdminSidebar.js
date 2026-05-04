"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Logo from "@/components/CrafitLogo";

import DashboardIcon from "@/assets/Dashboard.png";
import ManufacturersIcon from "@/assets/manufacture.png";
import TotalUsersIcon from "@/assets/TotalUsers.png";
import OrderIcon from "@/assets/orders.png";
import DisputesIcon from "@/assets/disputes.png";
import SupportIcon from "@/assets/support.png";
import ActivityLogIcon from "@/assets/ActivityLog.png";
import ProfileIcon from "@/assets/Adminprofile.png";
import LogoutIcon from "@/assets/logout.png";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/auth/login" });
  };

  const navItems = [
    { href: "/admin/dashboard", icon: DashboardIcon, label: "Dashboard", key: "dashboard" },
    { href: "/admin/manufacturers", icon: ManufacturersIcon, label: "Manufacturers", key: "manufacturers" },
    { href: "/admin/users", icon: TotalUsersIcon, label: "Users", key: "users" },
    { href: "/admin/orders", icon: OrderIcon, label: "Orders", key: "orders" },
    { href: "/admin/disputes", icon: DisputesIcon, label: "Disputes", key: "disputes" },
    { href: "/admin/support", icon: SupportIcon, label: "Support", key: "support" },
    { href: "/admin/activity-log", icon: ActivityLogIcon, label: "Activity Log", key: "activity-log" },
    { href: "/admin/profile", icon: ProfileIcon, label: "Profile", key: "profile" },
    { icon: LogoutIcon, label: "Logout", key: "logout", isLogout: true },
  ];

  const isActive = (item) => {
    if (item.href === "/admin/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-52 shrink-0 border-r border-slate-800/60 bg-[#020617] text-slate-200 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="py-6 border-b border-slate-800/60 px-4">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-[#eb9728]" />
          <span className="text-[#eb9728] text-lg font-black tracking-widest uppercase">
            Craftit
          </span>
        </Link>
      </div>

      {/* SECTION 1: SCROLLABLE NAVIGATION */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-4 pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navItems.map((item) => {
          if (item.isLogout) {
            return (
              <button
                key={item.key}
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex items-center gap-3 px-4 py-3.5 w-full border-l-2 border-l-transparent hover:bg-purple-900/20 hover:border-l-purple-500 hover:shadow-[inset_0_0_20px_rgba(168,85,247,0.15)] transition-all disabled:opacity-50"
              >
                <div className="relative shrink-0">
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={35}
                    height={35}
                  />
                </div>
                <span className="text-[14px] font-semibold text-left leading-tight text-slate-400 group-hover:text-purple-300 truncate">
                  {loggingOut ? "..." : item.label}
                </span>
              </button>
            );
          }

          const activeItem = isActive(item);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3.5 w-full border-l-2 transition-all ${
                activeItem
                  ? "bg-purple-500/10 border-l-purple-500 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]"
                  : "bg-transparent border-l-transparent hover:bg-purple-900/20 hover:border-l-purple-500 hover:shadow-[inset_0_0_20px_rgba(168,85,247,0.15)]"
              }`}
            >
              <div className="relative shrink-0">
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={35}
                  height={35}
                />
              </div>
              <span
                className={`text-[14px] font-semibold text-left leading-tight truncate ${
                  activeItem ? "text-purple-400" : "text-slate-400 group-hover:text-purple-300"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
