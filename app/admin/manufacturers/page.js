"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default function AdminManufacturersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    if (status !== "authenticated") return;

    if (!session?.user?.role) return;

    if (session.user.role !== "admin") {
      alert("Access denied. Admin access required.");
      router.replace("/");
      return;
    }

    fetchManufacturers();
  }, [status, session?.user?.role, filter]);

  const fetchManufacturers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/manufacturers?status=${filter}`);
      const data = await res.json();

      if (data.success) {
        setManufacturers(data.manufacturers);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error loading manufacturers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (manufacturerId, action, reason = "") => {
    if (!confirm(`Are you sure you want to ${action} this manufacturer?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/manufacturers/${manufacturerId}/verify`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            reason:
              action === "reject"
                ? reason || "Does not meet requirements"
                : undefined,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        await fetchManufacturers();
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl">Loading...</h1>
          {session && <LogoutButton />}
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manufacturer Verification</h1>
          {session?.user && (
            <p className="text-gray-600 mt-1">
              Logged in as: {session.user.name} ({session.user.email})
            </p>
          )}
        </div>
        <LogoutButton />
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 border-b-2 transition ${
                filter === status
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading manufacturers...</p>
        </div>
      )}

      {/* Manufacturers List */}
      {!loading && manufacturers.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No {filter} manufacturers found
        </div>
      ) : (
        <div className="grid gap-4">
          {manufacturers.map((manufacturer) => (
            <div
              key={manufacturer._id}
              className="bg-white p-6 rounded-lg shadow border"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">
                    {manufacturer.businessName}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">
                        <strong>Contact Person:</strong>{" "}
                        {manufacturer.contactPerson || manufacturer.name}
                      </p>
                      <p className="text-gray-600">
                        <strong>Email:</strong>{" "}
                        {manufacturer.businessEmail || manufacturer.email}
                      </p>
                      <p className="text-gray-600">
                        <strong>Phone:</strong>{" "}
                        {manufacturer.businessPhone || manufacturer.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">
                        <strong>Registration #:</strong>{" "}
                        {manufacturer.businessRegistrationNumber || "N/A"}
                      </p>
                      <p className="text-gray-600">
                        <strong>Location:</strong>{" "}
                        {manufacturer.businessAddress?.city},{" "}
                        {manufacturer.businessAddress?.country}
                      </p>
                      <p className="text-gray-600">
                        <strong>Registered:</strong>{" "}
                        {new Date(manufacturer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Capabilities */}
                  {manufacturer.manufacturingCapabilities?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold">Capabilities:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {manufacturer.manufacturingCapabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {cap.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Materials */}
                  {manufacturer.materialsAvailable?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold">Materials:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {manufacturer.materialsAvailable.map((mat) => (
                          <span
                            key={mat}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                          >
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {manufacturer.verificationDocuments?.documents?.length >
                    0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold">
                        Submitted Documents:
                      </p>
                      <ul className="mt-1 text-sm">
                        {manufacturer.verificationDocuments.documents.map(
                          (doc, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-gray-600">
                                • {doc.type.replace(/_/g, " ")}:
                              </span>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {doc.filename}
                              </a>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Description */}
                  {manufacturer.businessDescription && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold">Description:</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {manufacturer.businessDescription}
                      </p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {manufacturer.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-semibold text-red-800">
                        Rejection Reason:
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        {manufacturer.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="ml-4">
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      manufacturer.verificationStatus === "approved"
                        ? "bg-green-100 text-green-800"
                        : manufacturer.verificationStatus === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {manufacturer.verificationStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {manufacturer.verificationStatus === "pending" && (
                <div className="mt-4 flex gap-3 pt-4 border-t">
                  <button
                    onClick={() =>
                      handleVerify(String(manufacturer._id), "approve")
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt(
                        "Enter rejection reason (optional):"
                      );
                      handleVerify(String(manufacturer._id), "reject", reason);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
