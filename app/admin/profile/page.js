// app/admin/profile/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/");
    }
  }, [status, session, router]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPwSuccess("Password changed successfully.");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setPwError(data.error || "Failed to change password.");
      }
    } catch (err) {
      setPwError("Network error. Please try again.");
    } finally {
      setPwLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-50">Admin Profile</h1>
        <p className="text-slate-500 text-sm mt-1">
          Your account details and security settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Account Information
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-amber-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {session?.user?.name?.[0]?.toUpperCase() || "A"}
              </span>
            </div>
            <div>
              <p className="text-slate-50 font-semibold text-lg">
                {session?.user?.name}
              </p>
              <p className="text-slate-400 text-sm">{session?.user?.email}</p>
              <span className="px-2 py-0.5 bg-amber-900/40 text-amber-400 border border-amber-800/40 text-xs rounded mt-1 inline-block">
                Admin
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>

            {pwError && (
              <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-lg text-red-400 text-sm">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-emerald-400 text-sm">
                {pwSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Security Note */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-3">
            Security
          </h2>
          <div className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
            <span className="text-amber-400 text-lg mt-0.5">🔐</span>
            <div>
              <p className="text-slate-300 text-sm font-medium">
                Two-Factor Authentication
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                2FA enforcement is configured at the infrastructure level for
                admin accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
