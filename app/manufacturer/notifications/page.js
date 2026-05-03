// app/manufacturer/notifications/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const TYPE_ICONS = {
  order_placed: "shopping_bag",
  order_accepted: "check_circle",
  order_rejected: "cancel",
  order_shipped: "local_shipping",
  order_completed: "task_alt",
  order_cancelled: "remove_circle",
  bid_received: "gavel",
  bid_accepted: "handshake",
  bid_rejected: "do_not_disturb",
  bid_updated: "edit_note",
  new_message: "mail",
  dispute_opened: "report",
  dispute_resolved: "balance",
  payment_received: "payments",
  verification_approved: "verified",
  verification_rejected: "gpp_bad",
  default: "notifications",
};

const TYPE_COLORS = {
  order_placed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  order_completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  order_cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
  bid_accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  bid_rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  new_message: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  dispute_opened: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  dispute_resolved: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  payment_received: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  verification_approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  verification_rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  default: "text-white/40 bg-white/5 border-white/10",
};

export default function ManufacturerNotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=50");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchNotifications();
    }
  }, [status, session, router, fetchNotifications]);

  const markRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  const handleClick = async (notif) => {
    if (!notif.isRead) await markRead(notif._id);
    if (notif.link) router.push(notif.link);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
      </div>
    );
  }

  const groupedByDate = notifications.reduce((acc, n) => {
    const day = new Date(n.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(n);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
              Activity Stream
            </p>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent inline-block">
                Notifications
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <>
                <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  {unreadCount} new
                </span>
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-purple-500/10 hover:border-purple-500/30 transition-all disabled:opacity-50 group"
                >
                  <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">done_all</span>
                  <span>Mark all as read</span>
                </button>
              </>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white/[0.03] rounded-3xl border-2 border-purple-500/30 text-center py-24 px-8">
            <div className="h-20 w-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-5xl text-white/10">
                notifications_off
              </span>
            </div>
            <GlobalNoResults text="No notifications yet" />
            <p className="text-sm text-white/20 mt-2">We'll notify you when something important happens.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedByDate).map(([day, items]) => (
              <div key={day}>
                <div className="flex items-center gap-4 mb-4">
                  <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">
                    {day}
                  </p>
                  <div className="h-px bg-white/5 flex-1" />
                </div>
                <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-3xl overflow-hidden divide-y divide-white/5">
                  {items.map((notif) => {
                    const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
                    const colorClass =
                      TYPE_COLORS[notif.type] || TYPE_COLORS.default;
                    return (
                      <button
                        key={notif._id}
                        onClick={() => handleClick(notif)}
                        className={`w-full text-left flex items-start gap-5 p-5 transition-all group relative border-l-4 border-l-transparent ${
                          notif.isRead
                            ? "bg-transparent hover:bg-white/[0.07] hover:border-l-purple-500/50"
                            : "bg-[#eb9728]/5 hover:bg-[#eb9728]/10 border-l-[#eb9728]"
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${colorClass} group-hover:scale-110 transition-transform`}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <p
                              className={`text-base font-bold truncate transition-colors ${notif.isRead ? "text-white/70 group-hover:text-white" : "text-white"}`}
                            >
                              {notif.title}
                            </p>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter shrink-0">
                              {new Date(notif.createdAt).toLocaleTimeString(
                                "en-US",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </div>
                          <p className={`text-sm leading-relaxed line-clamp-2 transition-colors ${notif.isRead ? "text-white/40" : "text-white/60"}`}>
                            {notif.message}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-[#eb9728] rounded-full shrink-0 mt-3 shadow-[0_0_10px_rgba(235,151,40,0.5)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
