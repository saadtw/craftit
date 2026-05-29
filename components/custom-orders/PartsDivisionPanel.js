"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function PartsDivisionPanel({ customOrder, onPartsUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 1,
    material: "",
    colorSpec: "",
    budget: "",
    deadline: "",
    specialRequirements: "",
    annotationIds: [],
  });

  const availableAnnotations = customOrder?.model3D?.annotations || [];

  const handleOpenForm = (part = null) => {
    if (part) {
      setFormData({
        name: part.name || "",
        description: part.description || "",
        quantity: part.quantity || 1,
        material: part.material || "",
        colorSpec: part.colorSpec || "",
        budget: part.budget || "",
        deadline: part.deadline ? new Date(part.deadline).toISOString().split('T')[0] : "",
        specialRequirements: part.specialRequirements || "",
        annotationIds: part.annotationIds || [],
      });
      setEditingPart(part._id);
    } else {
      setFormData({
        name: "", description: "", quantity: 1, material: "", colorSpec: "", budget: "", deadline: "", specialRequirements: "", annotationIds: [],
      });
      setEditingPart(null);
    }
    setIsEditing(true);
  };

  const handleCloseForm = () => setIsEditing(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingPart 
      ? `/api/custom-orders/${customOrder._id}/parts/${editingPart}`
      : `/api/custom-orders/${customOrder._id}/parts`;
    const method = editingPart ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        onPartsUpdated();
        handleCloseForm();
      } else {
        alert("Error saving part: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (partId) => {
    if (!confirm("Delete this part?")) return;
    try {
      const res = await fetch(`/api/custom-orders/${customOrder._id}/parts/${partId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) onPartsUpdated();
      else alert("Error: " + data.error);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateRFQ = async (part) => {
    if (!confirm(`This will create a separate RFQ for '${part.name}'. Manufacturers will be able to bid on this part independently. Continue?`)) return;
    try {
      const res = await fetch(`/api/custom-orders/${customOrder._id}/parts/${part._id}/create-rfq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        alert("RFQ created successfully!");
        onPartsUpdated();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const toggleAnnotation = (id) => {
    setFormData(prev => ({
      ...prev,
      annotationIds: prev.annotationIds.includes(id) 
        ? prev.annotationIds.filter(a => a !== id)
        : [...prev.annotationIds, id]
    }));
  };

  if (!isOpen) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden p-6 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[16px] text-[#eb9728]">grid_view</span>
            Parts Division
          </h2>
          <p className="text-xs text-white/40">Divide your custom order into separate parts for individual RFQs.</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="px-5 py-2.5 rounded-xl border border-[#eb9728]/30 bg-[#eb9728]/10 text-xs font-bold text-[#eb9728] hover:bg-[#eb9728]/20 transition-all">
          Divide into Parts
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden mb-6">
      <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#eb9728]">grid_view</span>
          Parts Division
        </h2>
        <div className="flex items-center gap-3">
          {customOrder.isPartitioned && (
             <Link href={`/custom-orders/${customOrder._id}/parts`} className="text-[11px] font-bold text-purple-400 hover:text-purple-300">
               View Parts Overview →
             </Link>
          )}
          <button onClick={() => setIsOpen(false)} className="text-[11px] font-bold text-white/40 hover:text-white">Close</button>
        </div>
      </div>

      <div className="p-6">
        {customOrder.parts && customOrder.parts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {customOrder.parts.map(part => (
              <div key={part._id} className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-sm">{part.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${STATUS_BADGES[part.rfqStatus]}`}>
                    {STATUS_LABELS[part.rfqStatus]}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-white/50 mb-4">
                  <span>Qty: {part.quantity}</span>
                  {part.material && <span>Mat: {part.material}</span>}
                  {part.budget && <span className="text-emerald-400 font-medium">${part.budget}</span>}
                </div>
                
                {part.annotationIds && part.annotationIds.length > 0 && (
                  <p className="text-[10px] text-white/30 mb-4 truncate">
                    Tagged: {part.annotationIds.map(id => availableAnnotations.find(a => a.id === id)?.text || id).join(", ")}
                  </p>
                )}

                <div className="flex gap-2">
                  {part.rfqStatus === 'pending' && (
                    <>
                      <button onClick={() => handleOpenForm(part)} className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white/60 hover:bg-white/5">Edit</button>
                      <button onClick={() => handleDelete(part._id)} className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/10">Delete</button>
                      <button onClick={() => handleCreateRFQ(part)} className="flex-1 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-[10px] font-bold text-purple-400 hover:bg-purple-600/30 text-center">Create RFQ</button>
                    </>
                  )}
                  {part.rfqStatus !== 'pending' && part.rfqId && (
                     <Link href={`/customer/rfqs/${part.rfqId}`} className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white hover:bg-white/10 text-center">
                       View RFQ →
                     </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 mb-6">No parts defined yet. Divide your order to create independent RFQs.</p>
        )}

        {!isEditing ? (
          <button onClick={() => handleOpenForm()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#eb9728]/50 text-sm font-bold text-[#eb9728] hover:bg-[#eb9728]/10 transition-all">
            <span className="material-symbols-outlined text-[16px]">add</span> Add Part
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-white/10 bg-white/[0.03] space-y-4">
            <h3 className="text-sm font-bold text-white mb-4">{editingPart ? "Edit Part" : "New Part"}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">Part Name *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]" placeholder="e.g. Frame" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">Quantity</label>
                <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">Material</label>
                <input value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">Budget ($)</label>
                <input type="number" min="0" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]" />
            </div>

            {availableAnnotations.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-2">Linked Annotations</label>
                <div className="flex flex-wrap gap-2">
                  {availableAnnotations.map(anno => (
                    <button
                      type="button"
                      key={anno.id}
                      onClick={() => toggleAnnotation(anno.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${formData.annotationIds.includes(anno.id) ? "bg-purple-600/30 border border-purple-500 text-purple-300" : "bg-white/5 border border-white/10 text-white/40"}`}
                    >
                      {anno.text || "Tag"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="px-5 py-2 bg-[#eb9728] text-white text-xs font-bold rounded-lg hover:bg-[#eb9728]/80">Save Part</button>
              <button type="button" onClick={handleCloseForm} className="px-5 py-2 bg-white/5 text-white/60 text-xs font-bold rounded-lg hover:bg-white/10">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
