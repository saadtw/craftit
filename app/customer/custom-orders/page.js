// app/customer/custom-orders/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CustomOrdersListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        filter === "all"
          ? "/api/custom-orders"
          : `/api/custom-orders?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching custom orders:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
      fetchOrders();
    }
  }, [status, session, router, fetchOrders]);

  if (status === "loading" || loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Custom Orders
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your custom manufacturing orders
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/customer/dashboard">
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Back to Dashboard
                </button>
              </Link>
              <Link href="/custom-orders/new">
                <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                  + Create New Order
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            {["all", "draft", "pending", "accepted", "rejected"].map(
              (statusFilter) => (
                <button
                  key={statusFilter}
                  onClick={() => setFilter(statusFilter)}
                  className={`pb-3 px-2 text-sm font-medium capitalize transition-colors ${
                    filter === statusFilter
                      ? "border-b-2 border-amber-600 text-amber-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {statusFilter}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-4">
              <span className="material-symbols-outlined text-6xl">
                inventory_2
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No custom orders yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start by creating your first custom manufacturing order
            </p>
            <Link href="/custom-orders/new">
              <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                Create Custom Order
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.title}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {order.description}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Quantity: {order.quantity}</span>
                      {order.deadline && (
                        <span>
                          Deadline:{" "}
                          {new Date(order.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span>
                        Created:{" "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Link href={`/custom-orders/${order._id}/review`}>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        View Details
                      </button>
                    </Link>
                    {order.status === "draft" && (
                      <Link href={`/custom-orders/${order._id}/edit`}>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 whitespace-nowrap">
                          Edit
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
