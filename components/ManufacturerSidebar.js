"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

// Icons from assets
import DashboardIcon from "@/assets/Dashboard.png";
import ProductsIcon from "@/assets/products.png";
import OrdersIcon from "@/assets/orders.png";
import RFQIcon from "@/assets/RFQ.png";
import BidsIcon from "@/assets/bid.png";
import GroupBuyIcon from "@/assets/groupbuy.png";
import PaymentsIcon from "@/assets/payments.png";
import AnalyticsIcon from "@/assets/analytics.png";
import DisputesIcon from "@/assets/disputes.png";
import NotificationIcon from "@/assets/notification.png";
import SettingsIcon from "@/assets/settings.png";
import LogoutIcon from "@/assets/logout.png";

export default function ManufacturerSidebar({ session }) {
  const pathname = usePathname();
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!activeSession?.user?.id) return;
    fetch("/api/notifications?unread=true&limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.unreadCount !== undefined) setUnreadNotifs(d.unreadCount);
      })
      .catch(() => {});
  }, [activeSession?.user?.id]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/auth/login" });
  };

  const navItems = [
    { href: "/manufacturer/dashboard", icon: DashboardIcon, label: "Dashboard", key: "dashboard" },
    { href: "/manufacturer/products", icon: ProductsIcon, label: "Products", key: "products" },
    { href: "/manufacturer/orders", icon: OrdersIcon, label: "Orders", key: "orders" },
    { href: "/manufacturer/rfqs", icon: RFQIcon, label: "RFQs", key: "rfqs" },
    { href: "/manufacturer/bids", icon: BidsIcon, label: "My Bids", key: "bids" },
    { href: "/manufacturer/group-buys", icon: GroupBuyIcon, label: "Group Buys", key: "group-buys" },
    { href: "/manufacturer/financial", icon: PaymentsIcon, label: "Financials", key: "financial" },
    { href: "/manufacturer/analytics", icon: AnalyticsIcon, label: "Analytics", key: "analytics" },
    { href: "/manufacturer/disputes", icon: DisputesIcon, label: "Disputes", key: "disputes" },
    { 
      href: "/manufacturer/notifications", 
      icon: NotificationIcon, 
      label: "Notifications", 
      key: "notifications",
      badge: unreadNotifs > 0 ? unreadNotifs : null 
    },
    { href: "/manufacturer/settings", icon: SettingsIcon, label: "Settings", key: "settings" },
    { icon: LogoutIcon, label: "Logout", key: "logout", isLogout: true },
  ];

  const isActive = (item) => {
    if (item.href === "/manufacturer/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-30 shrink-0 border-r border-white/10 bg-[#050507] text-white flex flex-col h-full sticky top-0 z-30">
      <nav className="scrollbar-none flex-1 min-h-0 overflow-y-auto py-4 pb-24">
        {navItems.map((item) => {
          if (item.isLogout) {
            return (
              <button
                key={item.key}
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex flex-col items-center gap-1.5 px-2 py-3 w-full border-l-2 border-l-transparent hover:border-l-white/40 transition-all disabled:opacity-50"
              >
                <div className="relative">
                  <Image src={item.icon} alt={item.label} width={32} height={32} />
                </div>
                <span className="text-[15px] font-semibold text-center leading-tight text-white/70 group-hover:text-white">
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
              className={`group flex flex-col items-center gap-1.5 px-2 py-3 w-full border-l-2 transition-all ${
                activeItem
                  ? "bg-[#eb9728]/10 border-l-[#eb9728]"
                  : "bg-transparent border-l-transparent hover:border-l-white/40"
              }`}
            >
              <div className="relative">
                <Image src={item.icon} alt={item.label} width={32} height={32} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] bg-[#eb9728] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[15px] font-semibold text-center leading-tight ${
                  activeItem ? "text-[#eb9728]" : "text-white/70"
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
