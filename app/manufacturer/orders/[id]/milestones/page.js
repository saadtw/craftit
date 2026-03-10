"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const MILESTONE_STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export default function MilestonesManagementPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    dueDate: "",
  });
  const [addError, setAddError] = useState("");

  // Per-milestone update state
  const [updateNotes, setUpdateNotes] = useState({});

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
      fetchOrder();
    }
  }, [status, session]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.order);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addMilestone = async () => {
    setAddError("");
    if (!newMilestone.name.trim()) {
      setAddError("Milestone name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMilestone),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => ({ ...prev, milestones: data.milestones }));
        setNewMilestone({ name: "", description: "", dueDate: "" });
        setShowAddForm(false);
      } else {
        setAddError(data.error || "Failed to add milestone");
      }
    } catch (err) {
      setAddError("Error adding milestone");
    } finally {
      setSaving(false);
    }
  };

  const updateMilestone = async (milestoneId, newStatus) => {
    const notes = updateNotes[milestoneId] || "";
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, status: newStatus, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => ({
          ...prev,
          milestones: data.milestones,
          status: data.orderStatus || prev.status,
        }));
        setUpdateNotes((prev) => ({ ...prev, [milestoneId]: "" }));
      } else {
        alert(data.error || "Failed to update");
      }
    } catch (err) {
      alert("Error updating milestone");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <p className="text-gray-600">Loading milestones...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Order not found.</p>
      </div>
    );
  }

  const completedCount =
    order.milestones?.filter((m) => m.status === "completed").length || 0;
  const total = order.milestones?.length || 0;
  const progressPercent =
    total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-4">
          <Link
            href={`/manufacturer/orders/${id}`}
            className="text-sm text-gray-600 hover:text-orange-500"
          >
            ← Back to Order
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-mono font-bold text-blue-900">
            {order.orderNumber}
          </span>
          <span className="text-sm text-gray-500">— Milestones</span>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-blue-900">
            Production Milestones
          </h1>
          <p className="text-gray-600 mt-1">
            Track production stages for{" "}
            <strong>{order.productDetails?.name || order.orderNumber}</strong>
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm text-gray-500">
                Overall Production Progress
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {progressPercent}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Milestones Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {completedCount} / {total}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4">
            <div
              className="bg-linear-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Order Status Note */}
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            order.status === "completed"
              ? "bg-green-50 text-green-700 border border-green-200"
              : order.status === "in_production"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          Order Status:{" "}
          <strong>{order.status.replace(/_/g, " ").toUpperCase()}</strong>
          {order.status === "accepted" &&
            " — Start a milestone to automatically move order to 'In Production'."}
        </div>

        {/* Milestones List */}
        <div className="space-y-4 mb-6">
          {order.milestones?.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="text-lg mb-1">No milestones yet</p>
              <p className="text-sm">
                Add milestones to track production stages and keep your customer
                updated.
              </p>
            </div>
          )}

          {order.milestones?.map((m, i) => (
            <div
              key={m._id || i}
              className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${
                m.status === "completed"
                  ? "border-green-200"
                  : m.status === "in_progress"
                    ? "border-blue-300"
                    : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step number / check */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    m.status === "completed"
                      ? "bg-green-500 text-white"
                      : m.status === "in_progress"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {m.status === "completed" ? "✓" : i + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{m.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${MILESTONE_STATUS_COLORS[m.status]}`}
                    >
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {m.description}
                    </p>
                  )}
                  {m.dueDate && (
                    <p className="text-xs text-gray-400 mb-2">
                      Due: {new Date(m.dueDate).toLocaleDateString()}
                    </p>
                  )}
                  {m.completedAt && (
                    <p className="text-xs text-green-600 mb-2">
                      Completed: {new Date(m.completedAt).toLocaleString()}
                    </p>
                  )}
                  {m.notes && (
                    <p className="text-sm text-blue-700 bg-blue-50 rounded px-3 py-2 mb-2">
                      📝 {m.notes}
                    </p>
                  )}

                  {/* Update Controls */}
                  {["accepted", "in_production"].includes(order.status) &&
                    m.status !== "completed" && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <textarea
                          value={updateNotes[m._id] || ""}
                          onChange={(e) =>
                            setUpdateNotes((prev) => ({
                              ...prev,
                              [m._id]: e.target.value,
                            }))
                          }
                          placeholder="Add an update note (optional)..."
                          rows={2}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
                        />
                        <div className="flex gap-2">
                          {m.status === "pending" && (
                            <button
                              onClick={() =>
                                updateMilestone(m._id, "in_progress")
                              }
                              disabled={saving}
                              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              ▶ Start
                            </button>
                          )}
                          {m.status === "in_progress" && (
                            <button
                              onClick={() =>
                                updateMilestone(m._id, "completed")
                              }
                              disabled={saving}
                              className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              ✓ Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Milestone */}
        {["accepted", "in_production"].includes(order.status) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors text-sm font-medium"
              >
                + Add New Milestone
              </button>
            ) : (
              <div>
                <h3 className="font-bold text-gray-900 mb-4">New Milestone</h3>
                {addError && (
                  <p className="text-red-600 text-sm mb-3">{addError}</p>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newMilestone.name}
                      onChange={(e) =>
                        setNewMilestone((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. Material Procurement"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newMilestone.description}
                      onChange={(e) =>
                        setNewMilestone((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Brief description of this stage..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date (optional)
                    </label>
                    <input
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) =>
                        setNewMilestone((p) => ({
                          ...p,
                          dueDate: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={addMilestone}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm"
                    >
                      {saving ? "Adding..." : "Add Milestone"}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setAddError("");
                      }}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
