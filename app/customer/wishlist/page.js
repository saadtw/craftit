// app/customer/wishlist/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function CustomerWishlistPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [tab, setTab] = useState("product"); // "product" | "manufacturer"

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await fetch("/api/users/wishlist");
      const data = await res.json();
      if (data.wishlist) setWishlist(data.wishlist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchWishlist();
    }
  }, [status, session, router, fetchWishlist]);

  const removeItem = async (itemId, itemType) => {
    setRemoving(itemId);
    try {
      await fetch("/api/users/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType }),
      });
      setWishlist((prev) => prev.filter((w) => w._id?.toString() !== itemId));
    } catch (err) {
      console.error(err);
    } finally {
      setRemoving(null);
    }
  };

  const products = wishlist.filter((w) => w.itemType === "product");
  const manufacturers = wishlist.filter((w) => w.itemType === "manufacturer");

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading wishlist..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center h-16 px-6 sm:px-8 bg-[#050507]/80 backdrop-blur-sm border-b border-white/8 gap-4">
        <span className="text-base font-bold text-white">Wishlist</span>
        <span className="text-[11px] font-semibold text-white/30">
          {wishlist.length} saved item{wishlist.length !== 1 ? "s" : ""}
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page title */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
            Saved Items
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            My Wishlist
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
          {[
            { key: "product", label: `Products (${products.length})` },
            {
              key: "manufacturer",
              label: `Manufacturers (${manufacturers.length})`,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                tab === t.key
                  ? "bg-[#eb9728] text-black"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === "product" && (
          <>
            {products.length === 0 ? (
              <EmptyState
                icon="favorite"
                title="No saved products"
                desc="Browse products and save your favourites here."
                href="/customer/explore"
                cta="Explore Products"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((item) => {
                  const img =
                    item.images?.find((i) => i.isPrimary) || item.images?.[0];
                  return (
                    <div
                      key={item._id}
                      className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden group"
                    >
                      {/* Image */}
                      <div className="relative h-44 bg-white/[0.03]">
                        {img?.url ? (
                          <Image
                            src={img.url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="300px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-white/15">
                              inventory_2
                            </span>
                          </div>
                        )}
                        {/* Remove button */}
                        <button
                          onClick={() => removeItem(item._id, "product")}
                          disabled={removing === item._id}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/20 border border-white/10 transition-all"
                          title="Remove from wishlist"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {removing === item._id
                              ? "hourglass_empty"
                              : "favorite"}
                          </span>
                        </button>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <p className="font-bold text-white/85 text-sm line-clamp-2 mb-1">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-white/35 mb-3">
                          {item.manufacturerId?.businessName}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black text-[#eb9728]">
                            ${item.price?.toLocaleString()}
                          </span>
                          <Link
                            href={`/customer/products/${item._id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-white/60 hover:text-[#eb9728] px-3 py-1.5 bg-white/[0.04] border border-white/8 rounded-lg hover:border-[#eb9728]/20 hover:bg-[#eb9728]/10 transition-all"
                          >
                            View
                            <span className="material-symbols-outlined text-[13px]">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Manufacturers tab */}
        {tab === "manufacturer" && (
          <>
            {manufacturers.length === 0 ? (
              <EmptyState
                icon="storefront"
                title="No saved manufacturers"
                desc="Save manufacturers you'd like to work with again."
                href="/customer/explore"
                cta="Browse Manufacturers"
              />
            ) : (
              <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
                <div className="divide-y divide-white/5">
                  {manufacturers.map((item) => (
                    <div
                      key={item._id}
                      className="px-6 py-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-[#eb9728]/20 border border-[#eb9728]/20 flex items-center justify-center font-bold text-[#eb9728] text-lg shrink-0">
                        {item.businessName?.charAt(0) || "M"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white/85 truncate text-sm">
                          {item.businessName}
                        </p>
                        {item.stats?.averageRating > 0 && (
                          <p className="text-[11px] text-[#eb9728] mt-0.5">
                            {"★".repeat(Math.round(item.stats.averageRating))}{" "}
                            {item.stats.averageRating.toFixed(1)}
                          </p>
                        )}
                        {item.location?.city && (
                          <p className="text-[11px] text-white/30 mt-0.5">
                            {item.location.city}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/manufacturers/${item._id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-[11px] font-bold text-white/60 hover:bg-[#eb9728]/10 hover:border-[#eb9728]/20 hover:text-[#eb9728] transition-all"
                        >
                          View Profile
                          <span className="material-symbols-outlined text-[13px]">
                            arrow_forward
                          </span>
                        </Link>
                        <button
                          onClick={() => removeItem(item._id, "manufacturer")}
                          disabled={removing === item._id}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {removing === item._id
                              ? "hourglass_empty"
                              : "delete"}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ icon, title, desc, href, cta }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c11] py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-4xl text-white/20">
          {icon}
        </span>
      </div>
      <p className="text-base font-bold text-white/70 mb-1">{title}</p>
      <p className="text-sm text-white/35 mb-6">{desc}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eb9728] text-black font-bold rounded-xl text-sm hover:bg-[#d4871f] transition-all"
      >
        <span className="material-symbols-outlined text-[16px]">explore</span>
        {cta}
      </Link>
    </div>
  );
}
// // app/customer/wishlist/page.js
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import Link from "next/link";
// import Image from "next/image";

// export default function CustomerWishlistPage() {
//   const router = useRouter();
//   const { data: session, status } = useSession();
//   const [wishlist, setWishlist] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [removing, setRemoving] = useState(null);
//   const [tab, setTab] = useState("product"); // "product" | "manufacturer"

//   const fetchWishlist = useCallback(async () => {
//     try {
//       const res = await fetch("/api/users/wishlist");
//       const data = await res.json();
//       if (data.wishlist) setWishlist(data.wishlist);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/auth/login");
//       return;
//     }
//     if (status === "authenticated") {
//       if (session.user.role !== "customer") {
//         router.push("/auth/login");
//         return;
//       }
//       fetchWishlist();
//     }
//   }, [status, session, router, fetchWishlist]);

//   const removeItem = async (itemId, itemType) => {
//     setRemoving(itemId);
//     try {
//       await fetch("/api/users/wishlist", {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ itemId, itemType }),
//       });
//       setWishlist((prev) => prev.filter((w) => w._id?.toString() !== itemId));
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setRemoving(null);
//     }
//   };

//   const products = wishlist.filter((w) => w.itemType === "product");
//   const manufacturers = wishlist.filter((w) => w.itemType === "manufacturer");

//   if (status === "loading" || loading) {
//     return (
//       <div className="flex h-screen bg-[#f8f7f6]">
//         <main className="flex-1 flex items-center justify-center">
//           <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
//         </main>
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-screen bg-[#f8f7f6]">
//       <main className="flex-1 overflow-y-auto">
//         <header className="sticky top-0 z-10 flex items-center h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 gap-4">
//           <span className="text-lg font-bold text-gray-900">Wishlist</span>
//           <span className="text-sm text-gray-400">
//             {wishlist.length} saved items
//           </span>
//         </header>

//         <div className="p-8 max-w-5xl mx-auto">
//           {/* Tabs */}
//           <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
//             {[
//               { key: "product", label: `Products (${products.length})` },
//               {
//                 key: "manufacturer",
//                 label: `Manufacturers (${manufacturers.length})`,
//               },
//             ].map((t) => (
//               <button
//                 key={t.key}
//                 onClick={() => setTab(t.key)}
//                 className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
//                   tab === t.key
//                     ? "bg-[#eb9728] text-white"
//                     : "text-gray-600 hover:text-gray-900"
//                 }`}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>

//           {/* Products tab */}
//           {tab === "product" && (
//             <>
//               {products.length === 0 ? (
//                 <EmptyState
//                   icon="favorite"
//                   title="No saved products"
//                   desc="Browse products and save your favourites here."
//                   href="/customer/explore"
//                   cta="Explore Products"
//                 />
//               ) : (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                   {products.map((item) => {
//                     const img =
//                       item.images?.find((i) => i.isPrimary) || item.images?.[0];
//                     return (
//                       <div
//                         key={item._id}
//                         className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm group"
//                       >
//                         <div className="relative h-40 bg-gray-100">
//                           {img?.url ? (
//                             <Image
//                               src={img.url}
//                               alt={item.name}
//                               fill
//                               className="object-cover"
//                               sizes="300px"
//                             />
//                           ) : (
//                             <div className="w-full h-full flex items-center justify-center">
//                               <span className="material-symbols-outlined text-3xl text-gray-300">
//                                 inventory_2
//                               </span>
//                             </div>
//                           )}
//                           <button
//                             onClick={() => removeItem(item._id, "product")}
//                             disabled={removing === item._id}
//                             className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm"
//                             title="Remove from wishlist"
//                           >
//                             <span className="material-symbols-outlined text-base">
//                               {removing === item._id
//                                 ? "hourglass_empty"
//                                 : "favorite"}
//                             </span>
//                           </button>
//                         </div>
//                         <div className="p-4">
//                           <p className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
//                             {item.name}
//                           </p>
//                           <p className="text-xs text-gray-400 mb-2">
//                             {item.manufacturerId?.businessName}
//                           </p>
//                           <div className="flex items-center justify-between">
//                             <span className="font-bold text-[#eb9728]">
//                               ${item.price?.toLocaleString()}
//                             </span>
//                             <Link
//                               href={`/customer/products/${item._id}`}
//                               className="text-xs font-semibold text-gray-600 hover:text-[#eb9728] px-3 py-1.5 bg-gray-100 rounded-lg"
//                             >
//                               View
//                             </Link>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </>
//           )}

//           {/* Manufacturers tab */}
//           {tab === "manufacturer" && (
//             <>
//               {manufacturers.length === 0 ? (
//                 <EmptyState
//                   icon="storefront"
//                   title="No saved manufacturers"
//                   desc="Save manufacturers you'd like to work with again."
//                   href="/customer/explore"
//                   cta="Browse Manufacturers"
//                 />
//               ) : (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   {manufacturers.map((item) => (
//                     <div
//                       key={item._id}
//                       className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm"
//                     >
//                       <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-lg shrink-0">
//                         {item.businessName?.charAt(0) || "M"}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="font-semibold text-gray-900 truncate">
//                           {item.businessName}
//                         </p>
//                         {item.stats?.averageRating > 0 && (
//                           <p className="text-xs text-amber-500">
//                             {"★".repeat(Math.round(item.stats.averageRating))}{" "}
//                             {item.stats.averageRating.toFixed(1)}
//                           </p>
//                         )}
//                         <p className="text-xs text-gray-400">
//                           {item.location?.city || ""}
//                         </p>
//                       </div>
//                       <div className="flex flex-col gap-1.5 shrink-0">
//                         <Link
//                           href={`/manufacturers/${item._id}`}
//                           className="text-xs font-semibold text-[#eb9728] hover:underline"
//                         >
//                           View Profile
//                         </Link>
//                         <button
//                           onClick={() => removeItem(item._id, "manufacturer")}
//                           className="text-xs text-red-400 hover:text-red-600"
//                         >
//                           Remove
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }

// function EmptyState({ icon, title, desc, href, cta }) {
//   return (
//     <div className="text-center py-20">
//       <span className="material-symbols-outlined text-5xl text-gray-300 block mb-3">
//         {icon}
//       </span>
//       <p className="text-gray-700 font-semibold mb-1">{title}</p>
//       <p className="text-sm text-gray-400 mb-6">{desc}</p>
//       <Link
//         href={href}
//         className="inline-block px-5 py-2.5 bg-[#eb9728] text-white font-semibold rounded-xl text-sm hover:bg-[#eb9728]/90"
//       >
//         {cta}
//       </Link>
//     </div>
//   );
// }
