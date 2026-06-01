"use client";

import { useEffect, useState } from "react";
import { formatPKR } from "@/lib/currency";

export default function AdminEscrowPage() {
  const [stats, setStats] = useState(null);
  const [releases, setReleases] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [form, setForm] = useState({
    payoutMethod: "bank_transfer",
    externalReferenceId: "",
    adminNote: "",
  });
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [statsRes, releasesRes, txRes] = await Promise.all([
      fetch("/api/admin/escrow/stats"),
      fetch("/api/admin/escrow/releases"),
      fetch("/api/admin/escrow/transactions?limit=20"),
    ]);
    const [statsData, releasesData, txData] = await Promise.all([
      statsRes.json(),
      releasesRes.json(),
      txRes.json(),
    ]);
    setStats(statsData.stats || {});
    setReleases(releasesData.releases || []);
    setTransactions(txData.transactions || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function patchRelease(id, payload) {
    const res = await fetch(`/api/admin/escrow/releases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to update release");
      return;
    }
    setSelectedRelease(null);
    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-black">Escrow</h1>
        <p className="text-sm text-slate-400">
          Review held funds, manual payout queues, and escrow ledger activity.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Total in Escrow", stats?.totalInEscrow],
          ["Pending Releases", stats?.pendingReleases],
          ["Released This Month", stats?.releasedThisMonth],
          ["Refunded This Month", stats?.refundedThisMonth],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
            <div className="mt-2 text-xl font-black">
              {label === "Pending Releases" ? value || 0 : formatPKR(value || 0)}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <h2 className="font-black">Pending Manual Releases</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4">Order</th>
                <th className="p-4">Manufacturer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Connect</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-4 text-slate-400" colSpan="6">Loading...</td></tr>
              ) : releases.length === 0 ? (
                <tr><td className="p-4 text-slate-400" colSpan="6">No releases waiting.</td></tr>
              ) : (
                releases.map((release) => (
                  <tr key={release._id} className="border-t border-slate-800">
                    <td className="p-4">{release.orderId?.orderNumber || "Unknown"}</td>
                    <td className="p-4">{release.manufacturerId?.businessName || release.manufacturerId?.name || "Manufacturer"}</td>
                    <td className="p-4 font-bold">{formatPKR(release.amount)}</td>
                    <td className="p-4">{release.status.replace("_", " ")}</td>
                    <td className="p-4">{release.manufacturerId?.stripeConnectAccountId ? "Ready" : "Manual"}</td>
                    <td className="flex gap-2 p-4">
                      {release.manufacturerId?.stripeConnectAccountId && (
                        <button
                          onClick={() => patchRelease(release._id, { action: "stripe_transfer" })}
                          className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold"
                        >
                          Stripe
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRelease(release)}
                        className="rounded-md bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950"
                      >
                        Mark Paid
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <h2 className="font-black">Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Order</th>
                <th className="p-4">Type</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id} className="border-t border-slate-800">
                  <td className="p-4">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="p-4">{tx.orderId?.orderNumber || "N/A"}</td>
                  <td className="p-4">{tx.type.replace("_", " ")}</td>
                  <td className="p-4 font-bold">{formatPKR(tx.amount)}</td>
                  <td className="p-4 text-slate-400">{tx.reference || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRelease && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 p-5">
            <h2 className="text-lg font-black">Mark Paid Externally</h2>
            <div className="mt-4 grid gap-3">
              <select
                value={form.payoutMethod}
                onChange={(e) => setForm({ ...form, payoutMethod: e.target.value })}
                className="rounded-md border border-slate-700 bg-slate-900 p-3"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="manual">Manual</option>
              </select>
              <input
                value={form.externalReferenceId}
                onChange={(e) => setForm({ ...form, externalReferenceId: e.target.value })}
                placeholder="Reference ID"
                className="rounded-md border border-slate-700 bg-slate-900 p-3"
              />
              <textarea
                value={form.adminNote}
                onChange={(e) => setForm({ ...form, adminNote: e.target.value })}
                placeholder="Admin note"
                className="min-h-24 rounded-md border border-slate-700 bg-slate-900 p-3"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setSelectedRelease(null)} className="rounded-md border border-slate-700 px-4 py-2">
                Cancel
              </button>
              <button
                onClick={() =>
                  patchRelease(selectedRelease._id, { action: "mark_paid", ...form })
                }
                className="rounded-md bg-amber-500 px-4 py-2 font-bold text-slate-950"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
