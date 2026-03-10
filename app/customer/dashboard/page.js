"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function CustomerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    wishlistItems: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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
      fetchDashboardData();
    }
  }, [status, session, router]);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, customOrdersRes] = await Promise.all([
        fetch("/api/orders?limit=3"),
        fetch("/api/custom-orders?limit=3"),
      ]);
      const ordersData = await ordersRes.json();
      const customOrdersData = await customOrdersRes.json();

      const orders = ordersData.success ? ordersData.orders || [] : [];
      const customOrders = customOrdersData.success
        ? customOrdersData.orders || []
        : [];

      setRecentOrders(orders);
      setStats({
        totalOrders: ordersData.success
          ? ordersData.stats?.total || 0
          : customOrders.length,
        activeOrders: ordersData.success
          ? (ordersData.stats?.accepted || 0) +
            (ordersData.stats?.in_production || 0)
          : customOrders.filter((o) =>
              ["pending", "accepted"].includes(o.status),
            ).length,
        wishlistItems: session.user.wishlist?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      {/* Sidebar */}
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
            <h1 className="text-2xl font-bold text-gray-900">Craftit</h1>
          </div>
          <nav className="flex flex-col space-y-2">
            <Link
              href="/customer/dashboard"
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#eb9728]/20 text-[#eb9728]"
            >
              <span className="material-symbols-outlined">home</span>
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              href="/customer/custom-orders"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-900 hover:bg-[#eb9728]/10"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="font-medium">My Custom Orders</span>
            </Link>
            <Link
              href="/customer/rfqs"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-900 hover:bg-[#eb9728]/10"
            >
              <span className="material-symbols-outlined">gavel</span>
              <span className="font-medium">My RFQs</span>
            </Link>
            <Link
              href="/customer/orders"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-900 hover:bg-[#eb9728]/10"
            >
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="font-medium">Orders History</span>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              <span className="material-symbols-outlined">favorite</span>
              <span className="font-medium">Wishlist</span>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              <span className="material-symbols-outlined">mail</span>
              <span className="font-medium">Messages</span>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              <span className="material-symbols-outlined">payments</span>
              <span className="font-medium">Payments</span>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-medium">Settings</span>
            </Link>
          </nav>
        </div>
        <div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex-1"></div>
          <div className="flex items-center gap-6">
            <button className="relative text-gray-900 hover:text-[#eb9728]">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#eb9728] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#eb9728]"></span>
              </span>
            </button>
            <div className="w-10 h-10 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-semibold">
              {session.user.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        <div className="p-10">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pt-8">
            <div className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-6">
              <div className="bg-[#eb9728]/10 text-[#eb9728] p-4 rounded-full">
                <span className="material-symbols-outlined text-3xl">
                  receipt_long
                </span>
              </div>
              <div>
                <p className="text-base font-medium text-gray-600">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {/* {stats.totalOrders} */}
                </p>
              </div>
            </div>

            <div className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-6">
              <div className="bg-[#eb9728]/10 text-[#eb9728] p-4 rounded-full">
                <span className="material-symbols-outlined text-3xl">
                  pending_actions
                </span>
              </div>
              <div>
                <p className="text-base font-medium text-gray-600">
                  Active Orders
                </p>
                <p className="text-3xl font-bold text-[#eb9728] mt-1">
                  {/* {stats.activeOrders} */}
                </p>
              </div>
            </div>

            <div className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-6">
              <div className="bg-[#eb9728]/10 text-[#eb9728] p-4 rounded-full">
                <span className="material-symbols-outlined text-3xl">
                  favorite
                </span>
              </div>
              <div>
                <p className="text-base font-medium text-gray-600">
                  Wishlist Items
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {/* {stats.wishlistItems} */}
                </p>
              </div>
            </div>
          </div>
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/custom-orders/new">
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-amber-600">
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-100 text-amber-600 p-3 rounded-full">
                      <span className="material-symbols-outlined text-2xl">
                        add_circle
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Create Custom Order
                      </h3>
                      <p className="text-sm text-gray-600">
                        Start a new manufacturing request
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/customer/custom-orders">
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-amber-600">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                      <span className="material-symbols-outlined text-2xl">
                        inventory_2
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        View Custom Orders
                      </h3>
                      <p className="text-sm text-gray-600">
                        Manage your orders
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/customer/orders">
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-amber-600">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
                      <span className="material-symbols-outlined text-2xl">
                        receipt_long
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">My Orders</h3>
                      <p className="text-sm text-gray-600">
                        Track your order history
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Notifications */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Notifications
                  </h2>
                  <Link
                    href="/customer"
                    className="text-sm font-medium text-[#eb9728] hover:underline"
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="bg-[#eb9728]/10 text-[#eb9728] rounded-full p-2">
                      <span className="material-symbols-outlined">sell</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        New Product Alert
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        A new handcrafted leather journal has been added.{" "}
                        <span className="text-[#eb9728] font-medium">
                          Check it out!
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="bg-blue-100 text-blue-600 rounded-full p-2">
                      <span className="material-symbols-outlined">
                        local_shipping
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Order Shipped
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your order #12345 has been shipped.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-[#eb9728] border border-[#eb9728]/50 rounded-full hover:bg-[#eb9728]/10">
                      Track Order
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Orders */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    Active Orders
                  </h2>
                  <Link
                    href="/customer/orders"
                    className="text-sm font-medium text-[#eb9728] hover:underline"
                  >
                    View All Orders
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  {recentOrders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No orders yet
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-y border-gray-200 bg-gray-50">
                          <th className="px-6 py-3 text-sm font-medium text-gray-600 uppercase">
                            Product
                          </th>
                          <th className="px-6 py-3 text-sm font-medium text-gray-600 uppercase">
                            Order ID
                          </th>
                          <th className="px-6 py-3 text-sm font-medium text-gray-600 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-sm font-medium text-gray-600 uppercase text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentOrders.slice(0, 3).map((order) => (
                          <tr
                            key={order._id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {order.productDetails?.name || "Product"}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Est. Delivery:{" "}
                                    {order.estimatedDeliveryDate
                                      ? new Date(
                                          order.estimatedDeliveryDate,
                                        ).toLocaleDateString()
                                      : "TBD"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-900">
                              {order.orderNumber}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    order.status === "completed"
                                      ? "bg-green-500"
                                      : order.status === "in_production"
                                        ? "bg-blue-500"
                                        : "bg-yellow-500"
                                  }`}
                                ></span>
                                <span className="font-medium capitalize">
                                  {order.status.replace("_", " ")}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  router.push(`/customer/orders/${order._id}`)
                                }
                                className="text-[#eb9728] hover:text-[#eb9728]/80"
                              >
                                <span className="material-symbols-outlined">
                                  more_vert
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Quick Actions
                </h2>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => router.push("/customer")}
                    className="w-full px-6 py-3 bg-[#eb9728] text-white rounded-lg font-bold shadow-sm hover:bg-[#eb9728]/90"
                  >
                    Browse Products
                  </button>
                  <button
                    onClick={() => router.push("/custom-orders/new")}
                    className="w-full px-6 py-3 bg-[#eb9728]/20 text-[#eb9728] rounded-lg font-bold hover:bg-[#eb9728]/30"
                  >
                    Create Custom Order
                  </button>
                </div>
              </div>

              {/* Creative Insights */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Creative Insights
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                    <div>
                      <p className="font-bold text-gray-900">Featured Artist</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Meet Sarah, a talented artist specializing in watercolor
                        paintings.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                    <div>
                      <p className="font-bold text-gray-900">
                        Crafting Tips & Tricks
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Learn how to care for your handcrafted items to ensure
                        they last.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
