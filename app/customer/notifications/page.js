"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

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
  order_accepted: "text-green-600 bg-green-50",
  order_rejected: "text-red-600 bg-red-50",
  order_shipped: "text-indigo-600 bg-indigo-50",
  order_completed: "text-green-700 bg-green-50",
  order_cancelled: "text-red-600 bg-red-50",
  bid_accepted: "text-green-600 bg-green-50",
  bid_rejected: "text-red-600 bg-red-50",
  new_message: "text-blue-600 bg-blue-50",
  dispute_opened: "text-orange-600 bg-orange-50",
  dispute_resolved: "text-purple-600 bg-purple-50",
  payment_received: "text-emerald-600 bg-emerald-50",
  payment_refunded: "text-cyan-600 bg-cyan-50",
  verification_approved: "text-green-600 bg-green-50",
  verification_rejected: "text-red-600 bg-red-50",
  default: "text-gray-600 bg-gray-100",
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
      <div className="flex h-screen bg-[#f8f7f6]">
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
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
    <div className="flex h-screen bg-[#f8f7f6]">
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-[#eb9728] text-white text-xs font-bold rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="text-sm text-[#eb9728] font-semibold hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </header>

        <div className="max-w-2xl mx-auto p-6">
          {notifications.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-gray-300 block mb-3">
                notifications
              </span>
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-1">
                You&apos;ll see order updates, messages, and more here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([day, items]) => (
                <div key={day}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {day}
                  </p>
                  <div className="space-y-1">
                    {items.map((notif) => {
                      const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
                      const colorClass =
                        TYPE_COLORS[notif.type] || TYPE_COLORS.default;
                      return (
                        <button
                          key={notif._id}
                          onClick={() => handleClick(notif)}
                          className={`w-full text-left flex items-start gap-4 p-4 rounded-xl transition-colors ${
                            notif.isRead
                              ? "bg-white hover:bg-gray-50"
                              : "bg-amber-50/60 hover:bg-amber-50 border border-amber-100"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
                          >
                            <span className="material-symbols-outlined text-lg">
                              {icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold ${notif.isRead ? "text-gray-700" : "text-gray-900"}`}
                            >
                              {notif.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleTimeString(
                                "en-US",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="w-2 h-2 bg-[#eb9728] rounded-full shrink-0 mt-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
