"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPKR } from "@/lib/currency";

const STATUS_BADGES = {
  pending: "bg-white/5 border border-white/10 text-white/40",
  rfq_created: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
  bid_accepted:
    "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmRFQPart, setConfirmRFQPart] = useState(null);
  const toast = useToast();

  const totalPartsBudget =
    customOrder.parts?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
  const isOverBudget =
    customOrder.budget && totalPartsBudget > customOrder.budget;
  const rfqCount = customOrder.parts?.filter((p) => p.rfqId).length || 0;

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
    measurementIds: [],
  });

  const availableAnnotations = customOrder?.model3D?.annotations || [];
  const availableMeasurements = customOrder?.model3D?.measurements || [];

  const handleOpenForm = (part = null) => {
    if (part) {
      setFormData({
        name: part.name || "",
        description: part.description || "",
        quantity: part.quantity || 1,
        material: part.material || "",
        colorSpec: part.colorSpec || "",
        budget: part.budget || "",
        deadline: part.deadline
          ? new Date(part.deadline).toISOString().split("T")[0]
          : "",
        specialRequirements: part.specialRequirements || "",
        annotationIds: part.annotationIds || [],
        measurementIds: part.measurementIds || [],
      });
      setEditingPart(part._id);
    } else {
      setFormData({
        name: "",
        description: "",
        quantity: 1,
        material: "",
        colorSpec: "",
        budget: "",
        deadline: "",
        specialRequirements: "",
        annotationIds: [],
        measurementIds: [],
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
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onPartsUpdated();
        handleCloseForm();
        toast.success(
          editingPart
            ? "Part updated successfully!"
            : "Part added successfully!",
        );
      } else {
        toast.error("Error saving part: " + data.error);
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleDelete = async (partId) => {
    if (confirmDeleteId !== partId) {
      setConfirmDeleteId(partId);
      return;
    }
    setConfirmDeleteId(null);
    try {
      const res = await fetch(
        `/api/custom-orders/${customOrder._id}/parts/${partId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        onPartsUpdated();
        toast.success("Part deleted.");
      } else toast.error("Error: " + data.error);
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleCreateRFQ = async (part) => {
    if (confirmRFQPart?._id !== part._id) {
      setConfirmRFQPart(part);
      return;
    }
    setConfirmRFQPart(null);
    try {
      const res = await fetch(
        `/api/custom-orders/${customOrder._id}/parts/${part._id}/create-rfq`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("RFQ created successfully!");
        onPartsUpdated();
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const toggleAnnotation = (id) => {
    setFormData((prev) => ({
      ...prev,
      annotationIds: prev.annotationIds.includes(id)
        ? prev.annotationIds.filter((a) => a !== id)
        : [...prev.annotationIds, id],
    }));
  };

  const toggleMeasurement = (id) => {
    setFormData((prev) => ({
      ...prev,
      measurementIds: prev.measurementIds.includes(id)
        ? prev.measurementIds.filter((m) => m !== id)
        : [...prev.measurementIds, id],
    }));
  };

  if (!isOpen) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden p-6 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
              grid_view
            </span>
            Parts Division
            {customOrder.parts?.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/60 ml-2">
                {customOrder.parts.length} parts
              </span>
            )}
          </h2>
          <p className="text-xs text-white/40">
            Divide your custom order into separate parts for individual RFQs.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="px-5 py-2.5 rounded-xl border border-[#eb9728]/30 bg-[#eb9728]/10 text-xs font-bold text-[#eb9728] hover:bg-[#eb9728]/20 transition-all"
        >
          Divide into Parts
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden mb-6">
      <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
              grid_view
            </span>
            Parts Division
          </h2>
          {customOrder.parts?.length > 0 && (
            <p className="text-[10px] text-white/40 mt-1">
              {rfqCount} of {customOrder.parts.length} parts have active RFQs
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {customOrder.isPartitioned && (
            <Link
              href={`/custom-orders/${customOrder._id}/parts`}
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300"
            >
              View Parts Overview →
            </Link>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="text-[11px] font-bold text-white/40 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-6">
        {isOverBudget && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 flex items-start gap-3">
            <span className="material-symbols-outlined text-[16px] text-red-400 mt-0.5">
              warning
            </span>
            <div>
              <p className="text-xs font-bold text-red-400">Budget Warning</p>
              <p className="text-[11px] text-red-400/80">
                Total parts budget ({formatPKR(totalPartsBudget)}) exceeds the
                order&apos;s overall budget ({formatPKR(customOrder.budget)}).
              </p>
            </div>
          </div>
        )}
        {customOrder.parts && customOrder.parts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {customOrder.parts.map((part) => (
              <div
                key={part._id}
                className="p-4 rounded-xl border border-white/8 bg-white/[0.02]"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-sm">{part.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${STATUS_BADGES[part.rfqStatus]}`}
                  >
                    {STATUS_LABELS[part.rfqStatus]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-white/50 mb-4">
                  <span>Qty: {part.quantity}</span>
                  {part.material && <span>Mat: {part.material}</span>}
                  {part.colorSpec && <span>Color: {part.colorSpec}</span>}
                  {part.budget && (
                    <span className="text-emerald-400 font-medium">
                      {formatPKR(part.budget)}
                    </span>
                  )}
                  {part.deadline && (
                    <span>
                      Due: {new Date(part.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {part.specialRequirements && (
                  <p className="text-[10px] text-white/40 mb-4 line-clamp-2">
                    <span className="font-bold text-white/60">Reqs:</span>{" "}
                    {part.specialRequirements}
                  </p>
                )}

                {part.annotationIds && part.annotationIds.length > 0 && (
                  <p className="text-[10px] text-white/30 mb-2 truncate">
                    Tagged Annotations:{" "}
                    {part.annotationIds
                      .map(
                        (id) =>
                          availableAnnotations.find((a) => a.id === id)
                            ?.label ||
                          availableAnnotations.find((a) => a.id === id)?.text ||
                          id,
                      )
                      .join(", ")}
                  </p>
                )}
                {part.measurementIds && part.measurementIds.length > 0 && (
                  <p className="text-[10px] text-white/30 mb-4 truncate">
                    Tagged Measurements:{" "}
                    {part.measurementIds
                      .map(
                        (id) =>
                          availableMeasurements.find((m) => m.id === id)
                            ?.label ||
                          availableMeasurements.find((m) => m.id === id)?.text ||
                          id,
                      )
                      .join(", ")}
                  </p>
                )}

                {/* Inline Delete Confirmation */}
                {confirmDeleteId === part._id && (
                  <div className="mb-3 px-3 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold text-red-400">
                      Delete &quot;{part.name}&quot;? This cannot be undone.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(part._id)}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black hover:bg-red-400 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 rounded-lg bg-white/10 text-white/60 text-[10px] font-bold hover:bg-white/15 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline RFQ Confirmation */}
                {confirmRFQPart?._id === part._id && (
                  <div className="mb-3 px-3 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold text-purple-400">
                      Create a separate RFQ for &quot;{part.name}&quot;?
                      Manufacturers can bid independently.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleCreateRFQ(part)}
                        className="px-3 py-1 rounded-lg bg-purple-600 text-white text-[10px] font-black hover:bg-purple-500 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmRFQPart(null)}
                        className="px-3 py-1 rounded-lg bg-white/10 text-white/60 text-[10px] font-bold hover:bg-white/15 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {part.rfqStatus === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setConfirmRFQPart(null);
                          handleOpenForm(part);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white/60 hover:bg-white/5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setConfirmRFQPart(null);
                          handleDelete(part._id);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${
                          confirmDeleteId === part._id
                            ? "border-red-500/50 bg-red-500/20 text-red-300"
                            : "border-red-500/20 text-red-400 hover:bg-red-500/10"
                        }`}
                      >
                        {confirmDeleteId === part._id
                          ? "Click above ↑"
                          : "Delete"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteId(null);
                          handleCreateRFQ(part);
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold text-center transition-colors ${
                          confirmRFQPart?._id === part._id
                            ? "border-purple-500/50 bg-purple-600/30 text-purple-300"
                            : "bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600/30"
                        }`}
                      >
                        {confirmRFQPart?._id === part._id
                          ? "Confirm above ↑"
                          : "Create RFQ"}
                      </button>
                    </>
                  )}
                  {part.rfqStatus !== "pending" && part.rfqId && (
                    <Link
                      href={`/customer/rfqs/${part.rfqId}`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white hover:bg-white/10 text-center"
                    >
                      View RFQ →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-6 rounded-xl border border-white/5 bg-white/[0.02]">
            <span className="material-symbols-outlined text-3xl text-white/20 mb-3">
              account_tree
            </span>
            <p className="text-sm font-bold text-white/60 mb-1">
              No parts defined yet
            </p>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Divide your order into separate components to receive specialized
              bids for each part from different manufacturers.
            </p>
          </div>
        )}

        {!isEditing ? (
          <button
            onClick={() => handleOpenForm()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#eb9728]/50 text-sm font-bold text-[#eb9728] hover:bg-[#eb9728]/10 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>{" "}
            Add Part
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-5 rounded-xl border border-white/10 bg-white/[0.03] space-y-4"
          >
            <h3 className="text-sm font-bold text-white mb-4">
              {editingPart ? "Edit Part" : "New Part"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                  Part Name *
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                  placeholder="e.g. Frame"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                  Material
                </label>
                <input
                  value={formData.material}
                  onChange={(e) =>
                    setFormData({ ...formData, material: e.target.value })
                  }
                  className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                  placeholder="e.g. Aluminum 6061"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                  Color Spec
                </label>
                <input
                  value={formData.colorSpec}
                  onChange={(e) =>
                    setFormData({ ...formData, colorSpec: e.target.value })
                  }
                  className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                  placeholder="e.g. Matte Black Anodized"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                  Budget (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                  className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728] [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                placeholder="Detailed description of this part..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-white/40 mb-1">
                Special Requirements
              </label>
              <textarea
                value={formData.specialRequirements}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specialRequirements: e.target.value,
                  })
                }
                rows={2}
                className="w-full bg-[#050507] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                placeholder="Any specific tolerances, finishes, etc."
              />
            </div>

            {availableAnnotations.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-2">
                  Linked Annotations
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableAnnotations.map((anno) => (
                    <button
                      type="button"
                      key={anno.id}
                      onClick={() => toggleAnnotation(anno.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${formData.annotationIds.includes(anno.id) ? "bg-purple-600/30 border border-purple-500 text-purple-300" : "bg-white/5 border border-white/10 text-white/40"}`}
                    >
                      {anno.label || anno.text || "Tag"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableMeasurements.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-white/40 mb-2">
                  Linked Measurements
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableMeasurements.map((meas) => (
                    <button
                      type="button"
                      key={meas.id}
                      onClick={() => toggleMeasurement(meas.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${formData.measurementIds.includes(meas.id) ? "bg-purple-600/30 border border-purple-500 text-purple-300" : "bg-white/5 border border-white/10 text-white/40"}`}
                    >
                      {meas.label || meas.text || "Measurement"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2 bg-[#eb9728] text-white text-xs font-bold rounded-lg hover:bg-[#eb9728]/80"
              >
                Save Part
              </button>
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-5 py-2 bg-white/5 text-white/60 text-xs font-bold rounded-lg hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
