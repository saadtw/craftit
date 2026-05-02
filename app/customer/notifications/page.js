// app/customer/notifications/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const TYPE_ICONS = {
  order_placed: "shopping_bag",
  order_accepted: "check_circle",
  order_rejected: "cancel",
  order_in_production: "precision_manufacturing",
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
  group_buy_completed: "groups",
  group_buy_cancelled: "group_remove",
  payment_received: "payments",
  payment_refunded: "currency_exchange",
  verification_approved: "verified",
  verification_rejected: "gpp_bad",
  default: "notifications",
};

const TYPE_COLORS = {
  order_accepted: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  order_rejected: "text-red-300 bg-red-500/10 border-red-500/20",
  order_shipped: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
  order_completed: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  order_cancelled: "text-red-300 bg-red-500/10 border-red-500/20",
  bid_accepted: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  bid_rejected: "text-red-300 bg-red-500/10 border-red-500/20",
  new_message: "text-blue-300 bg-blue-500/10 border-blue-500/20",
  dispute_opened: "text-[#eb9728] bg-[#eb9728]/10 border-[#eb9728]/20",
  dispute_resolved: "text-purple-300 bg-purple-500/10 border-purple-500/20",
  payment_received: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  payment_refunded: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
  verification_approved:
    "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  verification_rejected: "text-red-300 bg-red-500/10 border-red-500/20",
  default: "text-white/55 bg-white/[0.04] border-white/10",
};

export default function CustomerNotificationsPage() {
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
      if (session.user.role !== "customer") {
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
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#eb9728]" />
          <GlobalLoader text="Loading notifications..." />
        </div>
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
      <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                Notification Center
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Notifications
              </h1>
              <p className="mt-2 text-sm text-white/50">
                Track order updates, messages, bids, payments, and account
                activity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <span className="rounded-full border border-[#eb9728]/20 bg-[#eb9728]/10 px-3 py-1 text-xs font-bold text-[#eb9728]">
                  {unreadCount} new
                </span>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 hover:border-[#eb9728]/40 hover:text-[#eb9728] disabled:opacity-50"
                >
                  {markingAll ? "Marking..." : "Mark all as read"}
                </button>
              )}
            </div>
          </div>
        </section>

        {notifications.length === 0 ? (
          <section className="rounded-[28px] border border-white/8 bg-[#0c0c11] px-6 py-20 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]">
              <span className="material-symbols-outlined text-5xl">
                notifications
              </span>
            </div>
            <GlobalNoResults text="No notifications yet" />
            <p className="mt-2 text-sm text-white/45">
              You&apos;ll see order updates, messages, and more here.
            </p>
          </section>
        ) : (
          <section className="space-y-6">
            {Object.entries(groupedByDate).map(([day, items]) => (
              <div key={day}>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/35">
                  {day}
                </p>

                <div className="space-y-2">
                  {items.map((notif) => {
                    const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
                    const colorClass =
                      TYPE_COLORS[notif.type] || TYPE_COLORS.default;

                    return (
                      <button
                        key={notif._id}
                        onClick={() => handleClick(notif)}
                        className={`group w-full rounded-[22px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                          notif.isRead
                            ? "border-white/8 bg-[#0c0c11] hover:border-[#eb9728]/30 hover:bg-white/[0.03]"
                            : "border-[#eb9728]/25 bg-[#eb9728]/10 hover:border-[#eb9728]/45"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${colorClass}`}
                          >
                            <span className="material-symbols-outlined text-[21px]">
                              {icon}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={`text-sm font-bold ${
                                  notif.isRead ? "text-white/75" : "text-white"
                                }`}
                              >
                                {notif.title}
                              </p>

                              {!notif.isRead && (
                                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#eb9728]" />
                              )}
                            </div>

                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/45">
                              {notif.message}
                            </p>

                            <p className="mt-2 text-xs text-white/30">
                              {new Date(notif.createdAt).toLocaleTimeString(
                                "en-US",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
