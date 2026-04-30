"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RequesterSupportPage({
  role,
  basePath,
  heading,
  subheading,
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ status: "all" });
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    subject: "",
    message: "",
    category: "other",
    priority: "medium",
  });

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        limit: "30",
        status: filters.status,
      });
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/support-tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      } else {
        setTickets([]);
        setErrorMessage(data.error || "Unable to load tickets.");
      }
    } catch (_) {
      setTickets([]);
      setErrorMessage("Unable to load tickets right now.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters.status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      if (session?.user?.role !== role) {
        router.push("/");
        return;
      }
      fetchTickets();
    }
  }, [status, session, role, fetchTickets, router]);

  const createTicket = async (e) => {
    e.preventDefault();
    if (creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({
          subject: "",
          message: "",
          category: "other",
          priority: "medium",
        });
        fetchTickets();
      } else {
        alert(data.error || "Failed to create ticket");
      }
    } catch (_) {
      alert("Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  const hasActiveFilters = Boolean(searchQuery) || filters.status !== "all";

  const STATUS_STYLES = {
    open: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    in_progress: "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]",
    waiting_for_user: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    resolved: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    closed: "bg-white/5 border-white/10 text-white/40",
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors";

  const selectClass =
    "w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors appearance-none";

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
            Support
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {heading}
          </h1>
          <p className="text-sm text-white/35 mt-1">{subheading}</p>
          {loading && tickets.length > 0 && (
            <p className="text-[11px] text-white/25 mt-2">
              Updating ticket list…
            </p>
          )}
        </div>

        {/* Create ticket */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/8">
            <h2 className="text-base font-bold text-white">Create Ticket</h2>
            <p className="text-sm text-white/35 mt-0.5">
              Describe your issue and we&apos;ll get back to you shortly.
            </p>
          </div>

          <form className="px-6 py-5 space-y-4" onSubmit={createTicket}>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                Subject
              </label>
              <input
                value={form.subject}
                onChange={(e) =>
                  setForm((p) => ({ ...p, subject: e.target.value }))
                }
                placeholder="Brief summary of your issue"
                className={inputClass}
                maxLength={160}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className={selectClass}
                >
                  <option value="other">General</option>
                  <option value="order">Order</option>
                  <option value="payment">Payment</option>
                  <option value="product">Product</option>
                  <option value="account">Account</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, priority: e.target.value }))
                  }
                  className={selectClass}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5">
                Message
              </label>
              <textarea
                value={form.message}
                onChange={(e) =>
                  setForm((p) => ({ ...p, message: e.target.value }))
                }
                rows={4}
                placeholder="Describe your issue in detail"
                className={`${inputClass} resize-none`}
                maxLength={3000}
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/25">
              <span>
                Include order number or product name for faster support.
              </span>
              <span>{form.message.length}/3000</span>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  creating ||
                  form.subject.trim().length < 3 ||
                  form.message.trim().length < 5
                }
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#eb9728] text-black hover:bg-[#d4871f] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      send
                    </span>
                    Submit Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Ticket list */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          {/* Filters */}
          <div className="px-6 py-4 border-b border-white/8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-white/25">
                search
              </span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ticket or subject"
                className="w-full bg-white/4 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#eb9728]/30 focus:border-[#eb9728]/60 transition-colors"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value }))
              }
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_for_user">Waiting for You</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setFilters({ status: "all" });
              }}
              disabled={!hasActiveFilters}
              className="sm:col-span-3 justify-self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-white/8 bg-white/3 text-white/40 hover:text-white/60 hover:bg-white/6 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[13px]">
                filter_alt_off
              </span>
              Clear filters
            </button>
          </div>

          {/* Count row */}
          <div className="px-6 py-2.5 border-b border-white/8 flex items-center justify-between">
            <span className="text-[11px] text-white/30 font-semibold">
              {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
            </span>
            {loading && tickets.length > 0 && (
              <span className="w-4 h-4 border-2 border-white/10 border-t-[#eb9728] rounded-full animate-spin" />
            )}
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="px-6 py-3 text-sm text-red-400 border-b border-red-500/20 bg-red-500/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px]">
                error
              </span>
              {errorMessage}
            </div>
          )}

          {/* Content */}
          {loading && tickets.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-white/10 border-t-[#eb9728] rounded-full animate-spin" />
              <p className="text-sm text-white/30">Loading tickets…</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl text-white/20">
                  support_agent
                </span>
              </div>
              <p className="text-sm text-white/35">
                {hasActiveFilters
                  ? "No tickets match your current filters."
                  : "No tickets yet. Create your first support ticket above."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {tickets.map((ticket) => (
                <Link
                  key={ticket._id}
                  href={`${basePath}/${ticket._id}`}
                  className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-white/2 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white/85 truncate group-hover:text-white transition-colors">
                      {ticket.subject}
                    </p>
                    <p className="text-[11px] text-white/35 mt-0.5 truncate">
                      {ticket.ticketNumber} · {ticket.category}
                    </p>
                    <p className="text-[11px] text-white/25 mt-1 truncate">
                      {ticket.lastMessagePreview || "No messages yet"}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${
                        STATUS_STYLES[ticket.status] ||
                        "bg-white/5 border-white/10 text-white/40"
                      }`}
                    >
                      {ticket.status?.replace(/_/g, " ")}
                    </span>
                    {ticket.unreadCount > 0 && (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-[#eb9728] text-black text-[10px] font-bold">
                        {ticket.unreadCount > 9 ? "9+" : ticket.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
// "use client";

// import { useCallback, useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";

// export default function RequesterSupportPage({
//   role,
//   basePath,
//   heading,
//   subheading,
// }) {
//   const { data: session, status } = useSession();
//   const router = useRouter();

//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [creating, setCreating] = useState(false);
//   const [searchInput, setSearchInput] = useState("");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filters, setFilters] = useState({ status: "all" });
//   const [errorMessage, setErrorMessage] = useState("");
//   const [form, setForm] = useState({
//     subject: "",
//     message: "",
//     category: "other",
//     priority: "medium",
//   });

//   useEffect(() => {
//     const id = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
//     return () => clearTimeout(id);
//   }, [searchInput]);

//   const fetchTickets = useCallback(async () => {
//     setLoading(true);
//     setErrorMessage("");
//     try {
//       const params = new URLSearchParams({
//         limit: "30",
//         status: filters.status,
//       });
//       if (searchQuery) params.set("q", searchQuery);

//       const res = await fetch(`/api/support-tickets?${params.toString()}`, {
//         cache: "no-store",
//       });
//       const data = await res.json();
//       if (data.success) {
//         setTickets(data.tickets || []);
//       } else {
//         setTickets([]);
//         setErrorMessage(data.error || "Unable to load tickets.");
//       }
//     } catch (_) {
//       setTickets([]);
//       setErrorMessage("Unable to load tickets right now.");
//     } finally {
//       setLoading(false);
//     }
//   }, [searchQuery, filters.status]);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/auth/login");
//       return;
//     }

//     if (status === "authenticated") {
//       if (session?.user?.role !== role) {
//         router.push("/");
//         return;
//       }
//       fetchTickets();
//     }
//   }, [status, session, role, fetchTickets, router]);

//   const createTicket = async (e) => {
//     e.preventDefault();
//     if (creating) return;

//     setCreating(true);
//     try {
//       const res = await fetch("/api/support-tickets", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(form),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setForm({
//           subject: "",
//           message: "",
//           category: "other",
//           priority: "medium",
//         });
//         fetchTickets();
//       } else {
//         alert(data.error || "Failed to create ticket");
//       }
//     } catch (_) {
//       alert("Failed to create ticket");
//     } finally {
//       setCreating(false);
//     }
//   };

//   const hasActiveFilters = Boolean(searchQuery) || filters.status !== "all";

//   const STATUS_STYLES = {
//     open: "bg-blue-100 text-blue-700",
//     in_progress: "bg-amber-100 text-amber-700",
//     waiting_for_user: "bg-purple-100 text-purple-700",
//     resolved: "bg-emerald-100 text-emerald-700",
//     closed: "bg-slate-100 text-slate-600",
//   };

//   return (
//     <div className="p-6 md:p-8 max-w-5xl mx-auto">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
//         <p className="text-sm text-gray-500 mt-1">{subheading}</p>
//         {loading && tickets.length > 0 && (
//           <p className="text-xs text-gray-400 mt-2">Updating ticket list...</p>
//         )}
//       </div>

//       <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
//         <h2 className="text-sm font-semibold text-gray-900 mb-3">
//           Create Ticket
//         </h2>
//         <form className="space-y-3" onSubmit={createTicket}>
//           <input
//             value={form.subject}
//             onChange={(e) =>
//               setForm((p) => ({ ...p, subject: e.target.value }))
//             }
//             placeholder="Subject"
//             className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
//             maxLength={160}
//             required
//           />

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//             <select
//               value={form.category}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, category: e.target.value }))
//               }
//               className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
//             >
//               <option value="other">General</option>
//               <option value="order">Order</option>
//               <option value="payment">Payment</option>
//               <option value="product">Product</option>
//               <option value="account">Account</option>
//               <option value="technical">Technical</option>
//             </select>

//             <select
//               value={form.priority}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, priority: e.target.value }))
//               }
//               className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
//             >
//               <option value="low">Low Priority</option>
//               <option value="medium">Medium Priority</option>
//               <option value="high">High Priority</option>
//             </select>
//           </div>

//           <textarea
//             value={form.message}
//             onChange={(e) =>
//               setForm((p) => ({ ...p, message: e.target.value }))
//             }
//             rows={4}
//             placeholder="Describe your issue"
//             className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none"
//             maxLength={3000}
//             required
//           />
//           <div className="flex items-center justify-between text-xs text-gray-400">
//             <span>
//               Include order number or product name for faster support.
//             </span>
//             <span>{form.message.length}/3000</span>
//           </div>

//           <div className="flex justify-end">
//             <button
//               type="submit"
//               disabled={
//                 creating ||
//                 form.subject.trim().length < 3 ||
//                 form.message.trim().length < 5
//               }
//               className="px-4 py-2.5 rounded-lg bg-[#eb9728] text-white text-sm font-semibold disabled:opacity-50"
//             >
//               {creating ? "Creating..." : "Submit Ticket"}
//             </button>
//           </div>
//         </form>
//       </section>

//       <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
//         <div className="p-4 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
//           <input
//             value={searchInput}
//             onChange={(e) => setSearchInput(e.target.value)}
//             placeholder="Search by ticket or subject"
//             className="sm:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
//           />
//           <select
//             value={filters.status}
//             onChange={(e) =>
//               setFilters((p) => ({ ...p, status: e.target.value }))
//             }
//             className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
//           >
//             <option value="all">All statuses</option>
//             <option value="open">Open</option>
//             <option value="in_progress">In Progress</option>
//             <option value="waiting_for_user">Waiting for You</option>
//             <option value="resolved">Resolved</option>
//             <option value="closed">Closed</option>
//           </select>

//           <button
//             type="button"
//             onClick={() => {
//               setSearchInput("");
//               setFilters({ status: "all" });
//             }}
//             disabled={!hasActiveFilters}
//             className="sm:col-span-3 justify-self-start px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white disabled:opacity-50"
//           >
//             Clear filters
//           </button>
//         </div>

//         <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
//           {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
//         </div>

//         {errorMessage && (
//           <div className="px-4 py-2 text-xs text-red-600 border-b border-red-100 bg-red-50">
//             {errorMessage}
//           </div>
//         )}

//         {loading && tickets.length === 0 ? (
//           <div className="p-10 text-center text-gray-400 text-sm">
//             Loading tickets...
//           </div>
//         ) : tickets.length === 0 ? (
//           <div className="p-10 text-center text-gray-400 text-sm">
//             {hasActiveFilters
//               ? "No tickets match your current filters."
//               : "No tickets yet. Create your first support ticket above."}
//           </div>
//         ) : (
//           <div className="divide-y divide-gray-100">
//             {tickets.map((ticket) => (
//               <Link
//                 key={ticket._id}
//                 href={`${basePath}/${ticket._id}`}
//                 className="block px-4 py-3 hover:bg-gray-50"
//               >
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="min-w-0">
//                     <p className="text-sm font-semibold text-gray-900 truncate">
//                       {ticket.subject}
//                     </p>
//                     <p className="text-xs text-gray-500 mt-0.5 truncate">
//                       {ticket.ticketNumber} · {ticket.category}
//                     </p>
//                     <p className="text-xs text-gray-400 mt-1 truncate">
//                       {ticket.lastMessagePreview || "No messages yet"}
//                     </p>
//                   </div>
//                   <div className="text-right shrink-0">
//                     <p
//                       className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[ticket.status] || "bg-slate-100 text-slate-600"}`}
//                     >
//                       {ticket.status?.replace(/_/g, " ")}
//                     </p>
//                     {ticket.unreadCount > 0 && (
//                       <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-[#eb9728] text-white text-[11px] font-semibold">
//                         {ticket.unreadCount > 9 ? "9+" : ticket.unreadCount}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         )}
//       </section>
//     </div>
//   );
// }
