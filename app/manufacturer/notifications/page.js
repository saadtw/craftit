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
  order_placed: "text-blue-600 bg-blue-50",
  order_completed: "text-green-700 bg-green-50",
  order_cancelled: "text-red-600 bg-red-50",
  bid_accepted: "text-green-600 bg-green-50",
  bid_rejected: "text-red-600 bg-red-50",
  new_message: "text-blue-600 bg-blue-50",
  dispute_opened: "text-orange-600 bg-orange-50",
  dispute_resolved: "text-purple-600 bg-purple-50",
  payment_received: "text-emerald-600 bg-emerald-50",
  verification_approved: "text-green-600 bg-green-50",
  verification_rejected: "text-red-600 bg-red-50",
  default: "text-gray-600 bg-gray-100",
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
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
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
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-blue-900">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="text-sm text-orange-500 font-semibold hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">
              notifications
            </span>
            <GlobalNoResults text="No notifications yet" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([day, items]) => (
              <div key={day}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {day}
                </p>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {items.map((notif, i) => {
                    const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
                    const colorClass =
                      TYPE_COLORS[notif.type] || TYPE_COLORS.default;
                    return (
                      <button
                        key={notif._id}
                        onClick={() => handleClick(notif)}
                        className={`w-full text-left flex items-start gap-4 p-4 transition-colors ${i > 0 ? "border-t border-gray-50" : ""} ${
                          notif.isRead
                            ? "bg-white hover:bg-gray-50"
                            : "bg-orange-50/40 hover:bg-orange-50"
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
                          <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-2" />
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
