// app/admin/dashboard/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from 'next/dynamic';

// Lottie for the main header animation
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Assets Import 
import AdminDashboardAni from "@/assets/AdminDashboard.json";
import PendingVerificationsIcon from "@/assets/PendingVerifications.png";
import TotalUsersIcon from "@/assets/TotalUsers.png";
import TotalManufacturersIcon from "@/assets/TotalManufacturers.png";
import OrdersIcon from "@/assets/orders.png";
import DisputesIcon from "@/assets/disputes.png";
import SettingsIcon from "@/assets/settings.png";
import { Portal } from "@radix-ui/react-select";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, logRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/activity-log?limit=10"),
      ]);
      const statsData = await statsRes.json();
      const logData = await logRes.json();
      setStats(statsData.stats || statsData);
      if (Array.isArray(logData.logs)) setActivityLog(logData.logs);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchDashboardData();
    } else if (status === "authenticated") {
      router.push("/");
    }
  }, [status, session, router, fetchDashboardData]);

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading dashboard..." />;
  }

  const statCards = [
    { label: "Pending Verifications", value: stats?.pendingVerifications ?? 0, img: PendingVerificationsIcon, href: "/admin/manufacturers", urgent: (stats?.pendingVerifications ?? 0) > 0 },
    { label: "Active Disputes", value: stats?.activeDisputes ?? 0, img: DisputesIcon, href: "/admin/disputes", urgent: (stats?.activeDisputes ?? 0) > 0 },
    { label: "Total Users", value: stats?.totalUsers ?? 0, img: TotalUsersIcon, href: "/admin/users", urgent: false },
    { label: "Total Manufacturers", value: stats?.totalManufacturers ?? 0, img: TotalManufacturersIcon, href: "/admin/manufacturers", urgent: false },
    { label: "Active Orders", value: stats?.activeOrders ?? 0, img: OrdersIcon, href: "/admin/orders", urgent: false },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-12 selection:bg-purple-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto p-6 lg:p-10">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 border-b border-white/5 pb-8">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text tracking-tighter uppercase leading-none">Executive Dashboard</h1>
            <p className="text-slate-400 text-lg mt-3 font-medium">
              Welcome back, <span className="text-purple-400 font-bold">{session?.user?.name || "Super Admin"}</span>. Here&apos;s what needs you attention.
            </p>
          </div>
          
          {/* Main Animation */}
         <div className="w-full md:w-80 h-40 md:h-44 flex items-center justify-center relative group">
            {/* Subtle glow behind animation */}
             <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-125 group-hover:bg-indigo-600/20 transition-all duration-700" />
            <Lottie 
              animationData={AdminDashboardAni} 
              loop={true} 
              className="w-full h-full object-contain relative z-10 transform scale-110"
            />
          </div>
        </header>

        {/* STATS GRID - Using Corrected PNG Imports */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {statCards.map((card) => (
            <Link key={card.label} href={card.href} 
              className="group relative bg-white/[0.02] border border-white/5 p-5 rounded-3xl hover:border-purple-500 hover:bg-purple-900/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all duration-300 backdrop-blur-md overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 relative group-hover:scale-110 transition-transform duration-300">
                  <Image src={card.img} alt={card.label} fill className="object-contain" />
                </div>
                {card.urgent && (
                  <span className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_10px_red]"></span>
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold text-white tracking-tight">{card.value}</h3>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mt-2 group-hover:text-purple-400 transition-colors">
                {card.label}
              </p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          
          {/* RECENT ACTIVITY STREAM */}
          <div className="xl:col-span-2">
            <section className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-md">
                <div className="px-8 py-7 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" />
                        <h2 className="font-bold text-xs text-white uppercase tracking-[0.3em]">Live System Stream</h2>
                    </div>
                    <Link href="/admin/activity-log" className="text-purple-400 text-[10px] font-black uppercase tracking-widest hover:text-purple-300 transition-colors">
                        View all &rarr;
                    </Link>
                </div>
                
                <div className="divide-y divide-white/5">
                    {activityLog.length === 0 ? (
                        <div className="p-20 text-center text-slate-500 text-sm font-medium italic">Scanning for activity...</div>
                    ) : (
                        activityLog.map((log, idx) => (
                            <div key={log._id || idx} className="px-6 py-4 hover:bg-purple-500/[0.03] transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-base group-hover:border-purple-400/40 transition-all shadow-inner">
                                      {log.action?.includes("approve") ? "✅" : log.action?.includes("reject") ? "❌" : log.action?.includes("suspend") ? "🔒" : log.action?.includes("dispute") ? "⚖️" : "📝"}
                                    </div>
                                    <div>
                                        <p className="text-slate-200 text-sm font-semibold group-hover:text-white transition-colors tracking-tight">{log.description || log.action}</p>
                                        <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mt-0.5 opacity-60">Verified by {log.adminId?.name || "System Root"}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-xs font-mono font-bold tracking-tighter">
                                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                                    </p>
                                    <p className="text-slate-600 text-[9px] font-black uppercase mt-0.5">
                                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Audit Logged"}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
          </div>

          {/* QUICK CONTROLS SIDEBAR */}
          <div className="space-y-8">
            <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 backdrop-blur-md">
                <h2 className="text-white font-black text-[11px] uppercase tracking-[0.4em] mb-8 opacity-50 text-center">Admin Controls</h2>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: "Verify", href: "/admin/manufacturers", img: PendingVerificationsIcon },
                        { label: "Disputes", href: "/admin/disputes", img: DisputesIcon },
                        { label: "Users", href: "/admin/users", img: TotalUsersIcon },
                        { label: "Settings", href: "/admin/settings", img: SettingsIcon },
                    ].map((item) => (
                        <Link key={item.label} href={item.href} 
                          className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-400/50 hover:bg-purple-500/10 transition-all group"
                        >
                            <div className="w-10 h-10 relative group-hover:scale-110 transition-transform duration-300">
                              <Image src={item.img} alt={item.label} fill className="object-contain" />
                            </div>
                            <span className="text-slate-300 text-[9px] font-black uppercase tracking-[0.2em] group-hover:text-purple-400">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* PRIORITY ACTION CARD */}
            {(stats?.pendingVerifications ?? 0) > 0 && (
                <div className="p-10 bg-gradient-to-br from-purple-500/20 via-[#0a0f1d] to-transparent border border-purple-500/30 rounded-[3rem] relative overflow-hidden group hover:border-purple-400 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-all" />
                    <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Urgent Task</p>
                    <p className="text-white text-xl font-bold mb-8 leading-tight">Review {stats.pendingVerifications} manufacturer applications.</p>
                    <Link href="/admin/manufacturers" className="flex items-center justify-center gap-3 py-4.5 bg-purple-600 text-white text-xs font-black uppercase tracking-widest rounded-[1.5rem] hover:bg-purple-500 transition-all shadow-lg active:scale-95">
                        View Applications
                    </Link>
                </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
