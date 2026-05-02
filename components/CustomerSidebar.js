"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useContext } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import CustomerLayoutContext from "@/app/customer/CustomerLayoutContext";

import HomeIcon from "@/assets/home.png";
import DashboardIcon from "@/assets/Dashboard.png";
import OrderIcon from "@/assets/orders.png";
import CustomOrderIcon from "@/assets/CustomOrderIcon.png";
import RFQIcon from "@/assets/RFQ.png";
import WishlistIcon from "@/assets/wishlist.png";
import MessageIcon from "@/assets/message.png";
import SupportIcon from "@/assets/support.png";
import PaymentsIcon from "@/assets/payments.png";
import NotificationIcon from "@/assets/notification.png";
import SettingsIcon from "@/assets/settings.png";
import LogoutIcon from "@/assets/logout.png";

export default function CustomerSidebar({ active, session }) {
  const renderedByCustomerLayout = useContext(CustomerLayoutContext);
  const pathname = usePathname();
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/auth/login" });
  };

  useEffect(() => {
    if (renderedByCustomerLayout || !activeSession?.user?.id) return;
    fetch("/api/notifications?unread=true&limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.unreadCount !== undefined) setUnreadNotifs(d.unreadCount);
      })
      .catch(() => {});
  }, [renderedByCustomerLayout, activeSession?.user?.id]);

  if (renderedByCustomerLayout) return null;

  const navItems = [
    { href: "/customer", icon: HomeIcon, label: "Home", key: "home" },
    {
      href: "/customer/dashboard",
      icon: DashboardIcon,
      label: "Dashboard",
      key: "dashboard",
    },
    {
      href: "/customer/orders",
      icon: OrderIcon,
      label: "Orders",
      key: "orders",
    },
    {
      href: "/customer/custom-orders",
      icon: CustomOrderIcon,
      label: "Custom",
      key: "custom-orders",
    },
    { href: "/customer/rfqs", icon: RFQIcon, label: "RFQs", key: "rfqs" },
    {
      href: "/customer/wishlist",
      icon: WishlistIcon,
      label: "Wishlist",
      key: "wishlist",
    },
    {
      href: "/customer/messages",
      icon: MessageIcon,
      label: "Messages",
      key: "messages",
    },
    {
      href: "/customer/support",
      icon: SupportIcon,
      label: "Support",
      key: "support",
    },
    {
      href: "/customer/payments",
      icon: PaymentsIcon,
      label: "Payments",
      key: "payments",
    },
    {
      href: "/customer/notifications",
      icon: NotificationIcon,
      label: "Notifications",
      key: "notifications",
      badge: unreadNotifs > 0 ? unreadNotifs : null,
    },
    {
      href: "/customer/settings",
      icon: SettingsIcon,
      label: "Settings",
      key: "settings",
    },
    {
      icon: LogoutIcon,
      label: "Logout",
      key: "logout",
      isLogout: true,
    },
  ];

  const isActive = (item) => {
    if (active) return active === item.key;
    if (item.href === "/customer") return pathname === item.href;
    if (item.href === "/customer/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-24 shrink-0 border-r border-white/10 bg-[#050507] text-white flex flex-col h-screen sticky top-0">
      {/* SECTION 1: SCROLLABLE NAVIGATION */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-4 pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navItems.map((item) => {
          // Handle logout button with same styling as other nav items
          if (item.isLogout) {
            return (
              <button
                key={item.key}
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex flex-col items-center gap-1.5 px-2 py-3 w-full border-l-2 border-l-transparent hover:border-l-white/40 transition-all disabled:opacity-50"
              >
                <div className="relative">
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={30}
                    height={30}
                  />
                </div>
                <span className="text-[15px] font-semibold text-center leading-tight text-white/70 group-hover:text-white">
                  {loggingOut ? "..." : item.label}
                </span>
              </button>
            );
          }

          // Regular navigation links
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
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={30}
                  height={30}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] bg-[#eb9728] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              {/* FIXED THE SYNTAX ERROR BELOW */}
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
