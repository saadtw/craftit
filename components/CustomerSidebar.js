"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useContext } from "react";
import { useSession } from "next-auth/react";
import LogoutButton from "@/components/LogoutButton";
import CustomerLayoutContext from "@/app/customer/CustomerLayoutContext";

export default function CustomerSidebar({ active, session }) {
  const renderedByCustomerLayout = useContext(CustomerLayoutContext);
  if (renderedByCustomerLayout) return null;

  const pathname = usePathname();
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!activeSession?.user?.id) return;
    fetch("/api/notifications?unread=true&limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.unreadCount !== undefined) setUnreadNotifs(d.unreadCount);
      })
      .catch(() => {});
  }, [activeSession?.user?.id]);

  const navItems = [
    {
      href: "/customer/dashboard",
      icon: "monitoring",
      label: "Dashboard",
      key: "dashboard",
    },
    {
      href: "/customer/orders",
      icon: "receipt_long",
      label: "Orders",
      key: "orders",
    },
    {
      href: "/customer/custom-orders",
      icon: "inventory_2",
      label: "My Custom Orders",
      key: "custom-orders",
    },
    { href: "/customer/rfqs", icon: "gavel", label: "My RFQs", key: "rfqs" },
    {
      href: "/customer/wishlist",
      icon: "favorite",
      label: "Wishlist",
      key: "wishlist",
    },
    {
      href: "/customer/messages",
      icon: "mail",
      label: "Messages",
      key: "messages",
    },
    {
      href: "/customer/payments",
      icon: "payments",
      label: "Payments",
      key: "payments",
    },
    {
      href: "/customer/notifications",
      icon: "notifications",
      label: "Notifications",
      key: "notifications",
      badge: unreadNotifs > 0 ? unreadNotifs : null,
    },
    {
      href: "/customer/settings",
      icon: "settings",
      label: "Settings",
      key: "settings",
    },
  ];

  const isActive = (item) => {
    if (active) return active === item.key;
    if (item.href === "/customer/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-64 shrink-0 bg-[#f8f7f6] p-6 flex flex-col justify-between border-r border-gray-200">
      <div>
        <div className="mb-10">
          <svg
            className="h-8 w-8 text-amber-600"
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
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Craftit</h1>
        </div>
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive(item)
                  ? "bg-[#eb9728]/20 text-[#eb9728]"
                  : "text-gray-700 hover:bg-[#eb9728]/10"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              <span className="font-medium text-sm flex-1">{item.label}</span>
              {item.badge && (
                <span className="w-5 h-5 bg-[#eb9728] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      <LogoutButton />
    </aside>
  );
}
