"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { href: "/admin/dashboard", icon: "⬡", label: "Dashboard" },
  { href: "/admin/manufacturers", icon: "🏭", label: "Manufacturers" },
  { href: "/admin/users", icon: "👥", label: "Users" },
  { href: "/admin/orders", icon: "📦", label: "Orders" },
  { href: "/admin/disputes", icon: "⚠️", label: "Disputes" },
  { href: "/admin/activity-log", icon: "📋", label: "Activity Log" },
  { href: "/admin/profile", icon: "👤", label: "Profile" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href) => {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 h-screen shrink-0 bg-slate-900 flex flex-col overflow-y-auto">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <svg
            className="h-7 w-7 text-amber-500"
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
          <div>
            <span className="text-slate-50 font-bold text-base tracking-tight">
              Craftit
            </span>
            <span className="block text-amber-500 text-xs font-medium tracking-widest uppercase">
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-amber-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        {session?.user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-slate-50 text-sm font-medium truncate">
              {session.user.name}
            </p>
            <p className="text-slate-500 text-xs truncate">
              {session.user.email}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
