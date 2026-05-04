"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiSearch, FiUser, FiShield, FiArrowRight } from "react-icons/fi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/admin/users?${params}`);
        const data = await res.json();
        if (data.success) {
          setUsers(data.users || []);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, statusFilter],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [status, session, router, fetchUsers]);

  const roleBadge = (role) => {
    const styles = {
      customer: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      manufacturer: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      admin: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[role] || "bg-white/5 text-white/40 border-white/10"}`}>
        {role}
      </span>
    );
  };

  const statusBadge = (isActive) => {
    const isSuspended = isActive === false;
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isSuspended ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${isSuspended ? "text-red-400" : "text-emerald-400"}`}>
          {isSuspended ? "Suspended" : "Active"}
        </span>
      </div>
    );
  };

  if (status === "loading") {
    return <GlobalLoader fullScreen text="Syncing user database..." />;
  }

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden selection:bg-purple-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[140px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text tracking-tighter uppercase leading-none mb-3">User Directory</h1>
          <p className="text-white/40 text-sm font-black uppercase tracking-[0.2em]">
            Monitor and manage the global CraftIt community
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          <div className="lg:col-span-6 relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors w-5 h-5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
              placeholder="Search by name or email..."
              className="w-full bg-white/[0.03] border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:border-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-white/20 text-sm font-medium shadow-2xl"
            />
          </div>
          <div className="lg:col-span-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-white rounded-2xl px-6 py-7 text-xs font-black tracking-widest uppercase hover:border-purple-500/50 transition-all cursor-pointer focus:ring-0">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                <SelectItem value="all" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs font-black uppercase tracking-widest transition-colors">All Roles</SelectItem>
                <SelectItem value="customer" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs font-black uppercase tracking-widest transition-colors">Customers</SelectItem>
                <SelectItem value="manufacturer" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs font-black uppercase tracking-widest transition-colors">Manufacturers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-white rounded-2xl px-6 py-7 text-xs font-black tracking-widest uppercase hover:border-purple-500/50 transition-all cursor-pointer focus:ring-0">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                <SelectItem value="all" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs font-black uppercase tracking-widest transition-colors">All Status</SelectItem>
                <SelectItem value="active" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs font-black uppercase tracking-widest transition-colors">Active Only</SelectItem>
                <SelectItem value="suspended" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs font-black uppercase tracking-widest transition-colors">Suspended Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]" />
              <h2 className="font-black text-[10px] text-white/40 uppercase tracking-[0.3em]">Master Records</h2>
            </div>
            <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest">
              {pagination.total} Platform Users
            </p>
          </div>

          {loading && users.length === 0 ? (
            <div className="py-20 flex justify-center">
              <GlobalLoader text="Accessing core database..." />
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center">
              <GlobalNoResults text="No users found matching your search" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">User Identity</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Privileges</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Lifecycle</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Registration</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <tr key={user._id} className="group hover:bg-white/[0.02] transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden text-white/20 font-black text-xl group-hover:bg-purple-500/10 group-hover:border-purple-500/20 group-hover:text-purple-500 transition-all shrink-0">
                            {user.image || user.profileImage ? (
                              <img src={user.image || user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="text-white font-bold tracking-tight leading-none mb-1">{user.name}</p>
                            <p className="text-white/20 text-xs font-medium tracking-tight">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {roleBadge(user.role)}
                      </td>
                      <td className="px-8 py-6">
                        {statusBadge(user.isActive)}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-white/40 text-xs font-bold tracking-tighter">
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <Link
                          href={`/admin/users/${user._id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-purple-600 hover:border-transparent text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg group/btn whitespace-nowrap"
                        >
                          View Profile
                          <FiArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-8 py-6 border-t border-white/5 bg-white/[0.01]">
              <p className="text-white/20 text-[10px] font-black tracking-widest uppercase">
                Fragment {pagination.page} / {pagination.pages}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 disabled:opacity-30 text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-all"
                >
                  &larr; Previous
                </button>
                <button
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 disabled:opacity-30 text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-all"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// LEGACY CODE PRESERVATION
// ---------------------------------------------------------

/*
// app/admin/users/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/admin/users?${params}`);
        const data = await res.json();
        if (data.success) {
          setUsers(data.users || []);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, statusFilter],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [status, session, router, fetchUsers]);

  const roleBadge = (role) => {
    const styles = {
      customer: "bg-sky-900/40 text-sky-400 border-sky-800/40",
      manufacturer: "bg-violet-900/40 text-violet-400 border-violet-800/40",
      admin: "bg-amber-900/40 text-amber-400 border-amber-800/40",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[role] || "bg-slate-800 text-slate-400 border-slate-700"}`}
      >
        {role}
      </span>
    );
  };

  const statusBadge = (isActive) => {
    const isSuspended = isActive === false;
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium border ${
          isSuspended
            ? "bg-red-900/40 text-red-400 border-red-800/40"
            : "bg-emerald-900/40 text-emerald-400 border-emerald-800/40"
        }`}
      >
        {isSuspended ? "Suspended" : "Active"}
      </span>
    );
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-50">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">
          View and manage all platform users
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
          className="bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-lg px-4 py-2 text-sm w-72 focus:border-amber-600 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="manufacturer">Manufacturers</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          onClick={() => fetchUsers(1)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-slate-500 text-sm">
            {pagination.total} users total
          </p>
        </div>
        {loading ? (
          <GlobalLoader text="Loading users..." />
        ) : users.length === 0 ? (
          <GlobalNoResults text="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-slate-200 text-sm font-medium">
                        {user.name}
                      </p>
                      <p className="text-slate-500 text-xs">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">{roleBadge(user.role)}</td>
                    <td className="px-6 py-4">{statusBadge(user.isActive)}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/users/${user._id}`}
                        className="text-amber-500 hover:text-amber-400 text-sm transition-colors"
                      >
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <p className="text-slate-500 text-sm">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
*/
