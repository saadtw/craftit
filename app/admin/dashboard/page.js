// "use client";

// import { useRouter } from "next/navigation";
// import LogoutButton from "@/components/LogoutButton";

// export default function AdminDashboard() {
//   const router = useRouter();
//   const manufacturersVerification = async () => {
//     router.push("/admin/manufacturers");
//   };
//   return (
//     <div>
//       <h1>Admin Dashboard</h1>
//       <br />
//       <button onClick={manufacturersVerification}>
//         Manufacturers Verification
//       </button>
//       <LogoutButton />
//     </div>
//   );
// }
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    activeDisputes: 0,
    totalUsers: 0,
    totalManufacturers: 0,
    activeOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        alert("Access denied. Admin access required.");
        router.push("/");
        return;
      }
      fetchStats();
    }
  }, [status, session, router]);

  const fetchStats = async () => {
    try {
      // Fetch pending manufacturers count
      const manufacturersRes = await fetch(
        "/api/admin/manufacturers?status=pending"
      );
      const manufacturersData = await manufacturersRes.json();

      setStats({
        pendingVerifications: manufacturersData.manufacturers?.length || 0,
        activeDisputes: 2, // Placeholder
        totalUsers: 1250, // Placeholder
        totalManufacturers: 450, // Placeholder
        activeOrders: 120, // Placeholder
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6">
        <div className="mb-8">
          <h1 className="text-slate-900 dark:text-slate-50 text-lg font-semibold">
            Craftit Admin
          </h1>
        </div>

        <nav className="space-y-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50"
          >
            <span>🏠</span>
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50"
          >
            <span>👥</span>
            <span className="text-sm font-medium">Users</span>
          </Link>

          <Link
            href="/admin/manufacturers"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50"
          >
            <span>🏭</span>
            <span className="text-sm font-medium">Manufacturers</span>
          </Link>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50">
            <span>📦</span>
            <span className="text-sm font-medium">Orders</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50">
            <span>⚠️</span>
            <span className="text-sm font-medium">Disputes</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50">
            <span>💰</span>
            <span className="text-sm font-medium">Transactions</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50">
            <span>📊</span>
            <span className="text-sm font-medium">Reports</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-50">
            <span>⚙️</span>
            <span className="text-sm font-medium">Settings</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Admin Dashboard
            </h2>
            {session?.user && (
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Welcome back, {session.user.name}
              </p>
            )}
          </div>

          {/* Quick Statistics */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Quick Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6">
                <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">
                  Pending Verifications
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.pendingVerifications}
                </p>
                <p className="text-green-600 text-sm mt-2">+10%</p>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6">
                <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">
                  Active Disputes
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.activeDisputes}
                </p>
                <p className="text-red-600 text-sm mt-2">-5%</p>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6">
                <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.totalUsers}
                </p>
                <p className="text-green-600 text-sm mt-2">+20%</p>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6">
                <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">
                  Total Manufacturers
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.totalManufacturers}
                </p>
                <p className="text-green-600 text-sm mt-2">+15%</p>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6">
                <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">
                  Active Orders
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.activeOrders}
                </p>
                <p className="text-green-600 text-sm mt-2">+8%</p>
              </div>
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Critical Alerts
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <span className="text-2xl">🏭</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">
                      Verification Request Pending
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      3 days ago
                    </p>
                  </div>
                </div>
                <span className="text-yellow-600">⚠️</span>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">
                      New Dispute Opened
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      1 day ago
                    </p>
                  </div>
                </div>
                <span className="text-yellow-600">⚠️</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/manufacturers"
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-center font-semibold"
              >
                Verify Manufacturers
              </Link>
              <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold">
                Resolve Disputes
              </button>
              <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold">
                View All Users
              </button>
              <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold">
                View All Orders
              </button>
            </div>
          </div>

          {/* Recent Admin Activities */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Recent Admin Activities
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full">
                <thead className="bg-white dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-50">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-50">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-50">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-50">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      action: "Verified Manufacturer",
                      admin: "Admin 1",
                      date: "2024-01-20 10:00 AM",
                    },
                    {
                      action: "Resolved dispute #234",
                      admin: "Admin 2",
                      date: "2024-01-19 03:30 PM",
                    },
                    {
                      action: "Deactivated user account",
                      admin: "Admin 1",
                      date: "2024-01-18 09:15 AM",
                    },
                    {
                      action: "Updated system settings",
                      admin: "Admin 1",
                      date: "2024-01-17 02:45 PM",
                    },
                    {
                      action: "Generated report",
                      admin: "Admin 2",
                      date: "2024-01-16 11:20 AM",
                    },
                  ].map((activity, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {activity.action}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {activity.admin}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {activity.date}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-900 dark:text-slate-50">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
