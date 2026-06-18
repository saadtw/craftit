"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import GlobalLoader from "@/components/ui/GlobalLoader";
import ModelViewerPreview from "@/modules/components/ModelViewerPreview";
import { formatPKR } from "@/lib/currency";

const STATUS_BADGES = {
  pending: "bg-white/5 border border-white/10 text-white/40",
  rfq_created: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
  bid_accepted: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
  order_placed: "bg-purple-500/10 border border-purple-500/20 text-purple-400",
};

const STATUS_LABELS = {
  pending: "Pending",
  rfq_created: "RFQ Created",
  bid_accepted: "Bid Accepted",
  order_placed: "Order Placed",
};

export default function PartsOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [customOrder, setCustomOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && session.user.role === "customer") {
      fetch(`/api/custom-orders/${params.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setCustomOrder(data.order);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, session, params.id, router]);

  if (loading || status === "loading") return <GlobalLoader fullScreen text="Loading Parts Overview..." />;
  if (!customOrder) return <div className="p-10 text-white text-center">Order not found.</div>;

  const parts = customOrder.parts || [];
  const partsWithRfq = parts.filter(p => p.rfqId).length;
  const partsWithOrder = parts.filter(p => p.orderId).length;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <CustomerMainNavbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Link href={`/custom-orders/${customOrder._id}/review`} className="text-[#eb9728] text-sm font-bold flex items-center gap-1 hover:underline mb-2">
            ← Back to Order
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white">{customOrder.title} - Parts Breakdown</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: 3D Model (if exists) */}
          <div className="lg:col-span-1">
            {customOrder.model3D ? (
              <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden sticky top-8">
                <div className="px-5 py-4 border-b border-white/8">
                  <h2 className="font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#eb9728] text-[18px]">view_in_ar</span>
                    3D Model Overview
                  </h2>
                </div>
                <div className="aspect-square bg-white/[0.02]">
                  <ModelViewerPreview
                    key={customOrder.model3D.url}
                    modelUrl={customOrder.model3D.url}
                    annotations={customOrder.model3D.annotations || []}
                    measurements={customOrder.model3D.measurements || []}
                    height="100%"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center text-white/30 text-sm">
                No 3D Model available for visualization.
              </div>
            )}
          </div>

          {/* Right Column: Parts List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-4">
              <div className="flex-1 p-4 rounded-2xl bg-white/[0.02] border border-white/8 text-center">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Parts</p>
                <p className="text-2xl font-black text-white">{parts.length}</p>
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-white/[0.02] border border-white/8 text-center">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">In RFQ Phase</p>
                <p className="text-2xl font-black text-blue-400">{partsWithRfq}</p>
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-white/[0.02] border border-white/8 text-center">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Ordered</p>
                <p className="text-2xl font-black text-purple-400">{partsWithOrder}</p>
              </div>
            </div>

            <div className="space-y-4">
              {parts.map(part => (
                <div key={part._id} className="rounded-2xl border border-white/8 bg-[#0c0c11] p-5 hover:border-white/20 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{part.name}</h3>
                      <p className="text-xs text-white/50">{part.description || "No description provided."}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${STATUS_BADGES[part.rfqStatus]}`}>
                      {STATUS_LABELS[part.rfqStatus]}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-white/30 mb-0.5">Quantity</span>
                      <span className="text-sm font-semibold text-white/80">{part.quantity}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-white/30 mb-0.5">Material</span>
                      <span className="text-sm font-semibold text-white/80">{part.material || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-white/30 mb-0.5">Budget</span>
                      <span className="text-sm font-semibold text-emerald-400">{part.budget ? formatPKR(part.budget) : "—"}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                    {part.rfqId && (
                      <Link href={`/customer/rfqs/${part.rfqId}`} className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-500/20">
                        View RFQ Details
                      </Link>
                    )}
                    {part.orderId && (
                      <Link href={`/customer/orders/${part.orderId}`} className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold rounded-lg hover:bg-purple-500/20">
                        View Order
                      </Link>
                    )}
                    {!part.rfqId && !part.orderId && (
                      <span className="text-xs font-semibold text-white/30 px-2 py-2">No active process for this part</span>
                    )}
                  </div>
                </div>
              ))}
              {parts.length === 0 && (
                <div className="p-10 text-center text-white/30 border border-dashed border-white/10 rounded-2xl">
                  This custom order has no distinct parts defined.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
