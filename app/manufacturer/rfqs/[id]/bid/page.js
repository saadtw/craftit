// "use client";

// import { useState, useEffect, use } from "react";
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";

// export default function PlaceBidPage({ params }) {
//   const unwrappedParams = use(params);
//   const router = useRouter();
//   const { data: session, status } = useSession();
//   const [loading, setLoading] = useState(false);
//   const [rfq, setRfq] = useState(null);
//   const [formData, setFormData] = useState({
//     rfqId: unwrappedParams.id,
//     amount: "",
//     timeline: "",
//     costBreakdown: {
//       materials: "",
//       labor: "",
//       overhead: "",
//       profit: "",
//     },
//     processDescription: "",
//     materialsDescription: "",
//     paymentTerms: "",
//     warrantyInfo: "",
//   });

//   useEffect(() => {
//     if (status === "authenticated") {
//       fetchRFQ();
//     }
//   }, [status]);

//   const fetchRFQ = async () => {
//     try {
//       const res = await fetch(`/api/rfqs/${unwrappedParams.id}`);
//       const data = await res.json();

//       if (res.ok && data.rfq) {
//         setRfq(data.rfq);
//       } else {
//         alert("Failed to load RFQ details");
//       }
//     } catch (error) {
//       alert("Error: " + error.message);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       const submitData = {
//         rfqId: formData.rfqId,
//         amount: Number(formData.amount),
//         timeline: Number(formData.timeline),
//         costBreakdown: {
//           materials: Number(formData.costBreakdown.materials) || 0,
//           labor: Number(formData.costBreakdown.labor) || 0,
//           overhead: Number(formData.costBreakdown.overhead) || 0,
//           profit: Number(formData.costBreakdown.profit) || 0,
//         },
//         processDescription: formData.processDescription,
//         materialsDescription: formData.materialsDescription,
//         paymentTerms: formData.paymentTerms,
//         warrantyInfo: formData.warrantyInfo,
//       };

//       const res = await fetch("/api/bids", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(submitData),
//       });

//       const data = await res.json();

//       if (!res.ok) throw new Error(data.error);

//       alert("Bid placed successfully!");
//       router.push(`/bids`); // This is dummy route for now.
//     } catch (error) {
//       alert(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (status === "loading" || !rfq)
//     return <div className="p-6">Loading...</div>;

//   if (status === "unauthenticated") {
//     router.push("/auth/login");
//     return null;
//   }

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6">Place Bid</h1>

//       {rfq && (
//         <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
//           <h2 className="text-xl font-bold mb-4">RFQ Details</h2>
//           <div className="space-y-2">
//             <p>
//               <strong>Project:</strong> {rfq.customOrderId?.title}
//             </p>
//             <p>
//               <strong>Quantity:</strong> {rfq.customOrderId?.quantity}
//             </p>
//             <p>
//               <strong>Budget:</strong> $
//               {rfq.customOrderId?.budget || "Not specified"}
//             </p>
//             <p>
//               <strong>Deadline:</strong>{" "}
//               {rfq.customOrderId?.deadline
//                 ? new Date(rfq.customOrderId.deadline).toLocaleDateString()
//                 : "Not specified"}
//             </p>
//           </div>
//         </div>
//       )}

//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div>
//           <label className="block font-semibold mb-2">Bid Amount ($) *</label>
//           <input
//             type="number"
//             value={formData.amount}
//             onChange={(e) =>
//               setFormData({ ...formData, amount: e.target.value })
//             }
//             required
//             min="0"
//             step="0.01"
//             className="w-full p-3 border rounded"
//           />
//         </div>

//         <div>
//           <label className="block font-semibold mb-2">Timeline (Days) *</label>
//           <input
//             type="number"
//             value={formData.timeline}
//             onChange={(e) =>
//               setFormData({ ...formData, timeline: e.target.value })
//             }
//             required
//             min="1"
//             className="w-full p-3 border rounded"
//           />
//         </div>

//         <div className="border-t pt-6">
//           <h3 className="text-xl font-bold mb-4">Cost Breakdown (Optional)</h3>

//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="block font-semibold mb-2">
//                 Materials Cost ($)
//               </label>
//               <input
//                 type="number"
//                 value={formData.costBreakdown.materials}
//                 onChange={(e) =>
//                   setFormData({
//                     ...formData,
//                     costBreakdown: {
//                       ...formData.costBreakdown,
//                       materials: e.target.value,
//                     },
//                   })
//                 }
//                 min="0"
//                 step="0.01"
//                 className="w-full p-3 border rounded"
//               />
//             </div>

//             <div>
//               <label className="block font-semibold mb-2">Labor Cost ($)</label>
//               <input
//                 type="number"
//                 value={formData.costBreakdown.labor}
//                 onChange={(e) =>
//                   setFormData({
//                     ...formData,
//                     costBreakdown: {
//                       ...formData.costBreakdown,
//                       labor: e.target.value,
//                     },
//                   })
//                 }
//                 min="0"
//                 step="0.01"
//                 className="w-full p-3 border rounded"
//               />
//             </div>

//             <div>
//               <label className="block font-semibold mb-2">
//                 Overhead Cost ($)
//               </label>
//               <input
//                 type="number"
//                 value={formData.costBreakdown.overhead}
//                 onChange={(e) =>
//                   setFormData({
//                     ...formData,
//                     costBreakdown: {
//                       ...formData.costBreakdown,
//                       overhead: e.target.value,
//                     },
//                   })
//                 }
//                 min="0"
//                 step="0.01"
//                 className="w-full p-3 border rounded"
//               />
//             </div>

//             <div>
//               <label className="block font-semibold mb-2">
//                 Profit Margin ($)
//               </label>
//               <input
//                 type="number"
//                 value={formData.costBreakdown.profit}
//                 onChange={(e) =>
//                   setFormData({
//                     ...formData,
//                     costBreakdown: {
//                       ...formData.costBreakdown,
//                       profit: e.target.value,
//                     },
//                   })
//                 }
//                 min="0"
//                 step="0.01"
//                 className="w-full p-3 border rounded"
//               />
//             </div>
//           </div>
//         </div>

//         <div>
//           <label className="block font-semibold mb-2">
//             Materials Description
//           </label>
//           <textarea
//             value={formData.materialsDescription}
//             onChange={(e) =>
//               setFormData({ ...formData, materialsDescription: e.target.value })
//             }
//             placeholder="Describe the materials you will use..."
//             rows={3}
//             className="w-full p-3 border rounded"
//           />
//         </div>

//         <div>
//           <label className="block font-semibold mb-2">
//             Process Description
//           </label>
//           <textarea
//             value={formData.processDescription}
//             onChange={(e) =>
//               setFormData({ ...formData, processDescription: e.target.value })
//             }
//             placeholder="Describe your manufacturing process..."
//             rows={4}
//             className="w-full p-3 border rounded"
//           />
//         </div>

//         <div>
//           <label className="block font-semibold mb-2">Payment Terms</label>
//           <textarea
//             value={formData.paymentTerms}
//             onChange={(e) =>
//               setFormData({ ...formData, paymentTerms: e.target.value })
//             }
//             placeholder="e.g., 50% upfront, 50% on completion"
//             rows={3}
//             className="w-full p-3 border rounded"
//           />
//         </div>

//         <div>
//           <label className="block font-semibold mb-2">
//             Warranty Information
//           </label>
//           <textarea
//             value={formData.warrantyInfo}
//             onChange={(e) =>
//               setFormData({ ...formData, warrantyInfo: e.target.value })
//             }
//             placeholder="Warranty terms and conditions..."
//             rows={3}
//             className="w-full p-3 border rounded"
//           />
//         </div>

//         <div className="flex gap-4 pt-4">
//           <button
//             type="submit"
//             disabled={loading}
//             className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
//           >
//             {loading ? "Submitting..." : "Submit Bid"}
//           </button>

//           <button
//             type="button"
//             onClick={() => router.back()}
//             className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600"
//           >
//             Cancel
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

// app/manufacturer/rfqs/[id]/bid/page.js
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function PlaceBidPage({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [rfq, setRfq] = useState(null);
  const [formData, setFormData] = useState({
    rfqId: unwrappedParams.id,
    amount: "",
    timeline: "",
    costBreakdown: {
      materials: "",
      labor: "",
      overhead: "",
      profit: "",
    },
    processDescription: "",
    materialsDescription: "",
    paymentTerms: "",
    warrantyInfo: "",
  });

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "manufacturer") {
      fetchRFQ();
    }
  }, [status, session]);

  const fetchRFQ = async () => {
    try {
      const res = await fetch(`/api/rfqs/${unwrappedParams.id}`);
      const data = await res.json();

      if (res.ok && data.rfq) {
        setRfq(data.rfq);
      } else {
        alert("Failed to load RFQ details");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        rfqId: formData.rfqId,
        amount: Number(formData.amount),
        timeline: Number(formData.timeline),
        costBreakdown: {
          materials: Number(formData.costBreakdown.materials) || 0,
          labor: Number(formData.costBreakdown.labor) || 0,
          overhead: Number(formData.costBreakdown.overhead) || 0,
          profit: Number(formData.costBreakdown.profit) || 0,
        },
        processDescription: formData.processDescription,
        materialsDescription: formData.materialsDescription,
        paymentTerms: formData.paymentTerms,
        warrantyInfo: formData.warrantyInfo,
      };

      const res = await fetch("/api/bids", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert("Bid placed successfully!");
      router.push(`/manufacturer/rfqs/${unwrappedParams.id}`);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !rfq) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (session?.user?.role !== "manufacturer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <Link
              href="/manufacturer/dashboard"
              className="flex items-center gap-2"
            >
              <span className="text-3xl">🔧</span>
              <span className="text-xl font-bold text-blue-900">Craftit</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            <Link href="/manufacturer/rfqs" className="hover:underline">
              Auctions
            </Link>{" "}
            / <span>{rfq.customOrderId?.title || "Custom Order"}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: RFQ Summary + Bids Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm text-gray-500">Project Overview</p>
                <h1 className="text-2xl font-bold text-blue-900 mt-1">
                  {rfq.customOrderId?.title || "Custom Order"}
                </h1>
                <p className="text-sm text-green-600 mt-1">Auction Active</p>
              </div>
              {rfq.customOrderId?.images?.[0]?.url && (
                <Image
                  src={rfq.customOrderId.images[0].url}
                  alt="Project"
                  width={192}
                  height={128}
                  className="object-cover rounded-lg shadow-md"
                />
              )}
            </div>

            {/* Current Bids Table */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-blue-900 mb-4">
                Current Bids
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Manufacturer
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Bid Amount
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Timeline
                      </th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Placeholder rows */}
                    <tr className="hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-800">
                        Manufacturer A
                      </td>
                      <td className="py-4 px-4 text-gray-800">$1,200</td>
                      <td className="py-4 px-4 text-gray-600">14 days</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full"
                              style={{ width: "95%" }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold">95</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-800">
                        Manufacturer B
                      </td>
                      <td className="py-4 px-4 text-gray-800">$1,150</td>
                      <td className="py-4 px-4 text-gray-600">12 days</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full"
                              style={{ width: "92%" }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold">92</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Bid Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-28">
              <h2 className="text-xl font-bold text-blue-900 mb-4">
                Place Your Bid
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bid Amount ($) *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="e.g 1000"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Estimated Delivery Time (Days) *
                  </label>
                  <input
                    type="number"
                    value={formData.timeline}
                    onChange={(e) =>
                      setFormData({ ...formData, timeline: e.target.value })
                    }
                    placeholder="e.g. 10 days"
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Warranty/Guarantee Period
                  </label>
                  <input
                    type="text"
                    value={formData.warrantyInfo}
                    onChange={(e) =>
                      setFormData({ ...formData, warrantyInfo: e.target.value })
                    }
                    placeholder="e.g. 2 years"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Optional Notes / Message
                  </label>
                  <textarea
                    value={formData.processDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        processDescription: e.target.value,
                      })
                    }
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300 transition"
                >
                  {loading ? "Submitting..." : "Place Bid"}
                </button>

                <p className="text-center text-xs text-gray-500">
                  You can edit or withdraw your bid until auction closes
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
