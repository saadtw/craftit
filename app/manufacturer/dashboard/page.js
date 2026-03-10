"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function ManufacturerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    activeRfqs: 0,
    unreadMessages: 0,
    completedOrders: 0,
    averageRating: 0,
  });
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "manufacturer") {
      fetchDashboardData();
    }
  }, [status, session]);

  const fetchDashboardData = async () => {
    try {
      const userResponse = await fetch("/api/auth/me");
      const userData = await userResponse.json();

      if (userData.success) {
        setStats({
          totalOrders: userData.user.stats?.totalOrders || 0,
          revenue: userData.user.stats?.totalRevenue || 0,
          activeRfqs: 0,
          unreadMessages: 0,
          completedOrders: userData.user.stats?.completedOrders || 0,
          averageRating: userData.user.stats?.averageRating || 0,
        });
      }

      const rfqsResponse = await fetch("/api/rfqs?status=active");
      const rfqsData = await rfqsResponse.json();

      if (rfqsData.success) {
        setStats((prev) => ({ ...prev, activeRfqs: rfqsData.rfqs.length }));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (session?.user?.role !== "manufacturer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">
          Access Denied. Manufacturers only.
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending_acceptance":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "in_production":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link
              href="/manufacturer/dashboard"
              className="flex items-center gap-2"
            >
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
              <h2 className="text-xl font-bold text-blue-900">Craftit</h2>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/manufacturer/dashboard"
                className="text-sm font-bold text-orange-500"
              >
                Dashboard
              </Link>
              <Link
                href="/manufacturer/products"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                Products Management
              </Link>
              <Link
                href="/manufacturer/orders"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                Orders
              </Link>
              <Link
                href="/manufacturer/rfqs"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                RFQs & Bidding
              </Link>
              <Link
                href="/manufacturer/bids"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                My Bids
              </Link>
              <Link
                href="/manufacturer/group-buys"
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                Group Buys
              </Link>
              <Link
                href={`/manufacturers/${session?.user?.id}`}
                className="text-sm font-medium text-gray-700 hover:text-orange-500"
              >
                My Profile
              </Link>
              <Link
                href="#"
                className="text-sm font-medium text-gray-400 cursor-not-allowed"
                title="Coming soon"
              >
                Messages
              </Link>
              <Link
                href="#"
                className="text-sm font-medium text-gray-400 cursor-not-allowed"
                title="Coming soon"
              >
                Payments
              </Link>
              <Link
                href="#"
                className="text-sm font-medium text-gray-400 cursor-not-allowed"
                title="Coming soon"
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* <button className="p-2 rounded-full hover:bg-gray-100 text-gray-700">
              🔔
            </button> */}
            <LogoutButton />
            {/* <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
              {session.user.name?.charAt(0) || "M"}
            </div> */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-blue-900 mb-2">
            Manufacturer Dashboard
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-base font-medium mb-2">
              Total Orders
            </p>
            <p className="text-blue-900 text-2xl font-bold mb-2">
              {stats.totalOrders}
            </p>
            <p className="text-green-600 text-base font-medium">+10%</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-base font-medium mb-2">
              Revenue Metrics
            </p>
            <p className="text-blue-900 text-2xl font-bold mb-2">
              ${stats.revenue.toLocaleString()}
            </p>
            <p className="text-green-600 text-base font-medium">+5%</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-base font-medium mb-2">
              Active Auctions
            </p>
            <p className="text-blue-900 text-2xl font-bold mb-2">
              {stats.activeRfqs}
            </p>
            <p className="text-red-600 text-base font-medium">-2%</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-base font-medium mb-2">
              Unread Messages
            </p>
            <p className="text-blue-900 text-2xl font-bold mb-2">
              {stats.unreadMessages}
            </p>
            <p className="text-green-600 text-base font-medium">+8%</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/manufacturer/rfqs">
              <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-orange-500 p-6 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 text-orange-600 p-3 rounded-full">
                    <span className="material-symbols-outlined text-2xl">
                      gavel
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Browse RFQs</h3>
                    <p className="text-sm text-gray-600">
                      Find new bidding opportunities
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/manufacturer/bids">
              <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-orange-500 p-6 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                    <span className="material-symbols-outlined text-2xl">
                      description
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">My Bids</h3>
                    <p className="text-sm text-gray-600">
                      Manage your active bids
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/manufacturer/group-buys">
              <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-orange-500 p-6 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
                    <span className="material-symbols-outlined text-2xl">
                      group
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Group Buys</h3>
                    <p className="text-sm text-gray-600">
                      Manage group buy campaigns
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/manufacturer/orders">
              <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-orange-500 p-6 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
                    <span className="material-symbols-outlined text-2xl">
                      receipt_long
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Manage Orders</h3>
                    <p className="text-sm text-gray-600">
                      View and fulfil customer orders
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Active Orders Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blue-900">Active Orders</h2>
            <Link
              href="/manufacturer/orders"
              className="text-sm font-medium text-orange-500 hover:text-orange-600 hover:underline"
            >
              View All Orders →
            </Link>
          </div>

          {activeOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No active orders at the moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-blue-900 text-sm font-medium">
                      Order ID
                    </th>
                    <th className="px-4 py-3 text-left text-blue-900 text-sm font-medium">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-blue-900 text-sm font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-blue-900 text-sm font-medium">
                      Deadline
                    </th>
                    <th className="px-4 py-3 text-left text-blue-900 text-sm font-medium">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map((order) => (
                    <tr key={order._id} className="border-t border-gray-200">
                      <td className="px-4 py-4 text-blue-900 text-sm font-normal">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm">
                        {order.customerId?.name || "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium w-full ${getStatusColor(
                            order.status,
                          )}`}
                        >
                          {order.status.replace("_", " ").toUpperCase()}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm">
                        {order.estimatedDeliveryDate
                          ? new Date(
                              order.estimatedDeliveryDate,
                            ).toLocaleDateString()
                          : "TBD"}
                      </td>
                      <td className="px-4 py-4">
                        <button className="px-4 py-2 bg-gray-100 text-blue-900 rounded-lg text-sm font-medium w-full hover:bg-gray-200">
                          High
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Analytics */}
        <h2 className="text-2xl font-bold text-blue-900 mb-4">
          Performance Analytics Summary
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-blue-900 text-base font-medium mb-2">
              Monthly Revenue
            </p>
            <p className="text-blue-900 text-3xl font-bold mb-2">$123,456</p>
            <div className="flex gap-2 mb-4">
              <p className="text-gray-600 text-base">Last 12 Months</p>
              <p className="text-green-600 text-base font-medium">+5%</p>
            </div>
            <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Chart Placeholder</p>
            </div>
          </div>

          {/* Order Completion Rate */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-blue-900 text-base font-medium mb-2">
              Order Completion Rate
            </p>
            <p className="text-blue-900 text-3xl font-bold mb-2">92%</p>
            <div className="flex gap-2 mb-4">
              <p className="text-gray-600 text-base">Last 3 Months</p>
              <p className="text-red-600 text-base font-medium">-2%</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Jan</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-600 h-2 rounded-full"
                    style={{ width: "70%" }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Feb</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-600 h-2 rounded-full"
                    style={{ width: "80%" }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Mar</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-600 h-2 rounded-full"
                    style={{ width: "40%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © 2026 Craftit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
