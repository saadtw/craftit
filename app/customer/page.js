"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchWithCache } from "@/lib/clientCache";
import { useWishlist } from "@/lib/hooks/useWishlist";
import Image from "next/image";
import browseProductsIcon from "@/assets/BrowseProducts.png";
import GroupBuy from "@/assets/groupbuy.png";
import FindManufacturers from "@/assets/FindManufacturers.png";

import dashboardIcon from "@/assets/Dashboard.png";
import ordersIcon from "@/assets/orders.png";
import rfqIcon from "@/assets/RFQ.png";
import wishlistIcon from "@/assets/wishlist.png";
import settingsIcon from "@/assets/settings.png";
import paymentsIcon from "@/assets/payments.png";
import Lottie from "lottie-react";
import HomeScreenAnimation from "@/assets/HomeScreenAnimation.json";

const WORKSPACE_LINKS = [
  { href: "/customer/dashboard", icon: dashboardIcon, label: "Dashboard" },
  { href: "/customer/orders", icon: ordersIcon, label: "Orders" },
  { href: "/customer/rfqs", icon: rfqIcon, label: "RFQs" },
  { href: "/customer/wishlist", icon: wishlistIcon, label: "Wishlist" },
  { href: "/customer/settings", icon: settingsIcon, label: "Settings" },
  { href: "/customer/payments", icon: paymentsIcon, label: "Payments" },
];

function currency(value) {
  if (typeof value !== "number") return "-";
  return `$${value.toLocaleString()}`;
}

function daysLeft(dateString) {
  if (!dateString) return 0;
  const ms = new Date(dateString).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function CustomerHomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Use SWR hook for wishlist
  const {
    wishlistSet,
    toggleWishlist,
    isLoading: wishlistLoading,
  } = useWishlist();

  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [isSuggestedPersonalized, setIsSuggestedPersonalized] = useState(true);
  const [recentProducts, setRecentProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeGroupBuys, setActiveGroupBuys] = useState([]);
  const [featuredManufacturers, setFeaturedManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let recentIds = [];
      if (typeof window !== "undefined") {
        const storageKey = "craftit_recently_viewed_products";
        const parsedIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
        recentIds = Array.isArray(parsedIds)
          ? parsedIds.filter((pId) => typeof pId === "string").slice(0, 3)
          : [];
      }

      const suggestedPath = recentIds.length
        ? `/api/products/suggested?limit=6&recentIds=${recentIds.join(",")}`
        : "/api/products/suggested?limit=6";

      const [
        suggestedData,
        recentData,
        productsData,
        groupBuysData,
        manufacturersData,
      ] = await Promise.all([
        fetchWithCache(suggestedPath, 60000),
        recentIds.length
          ? fetchWithCache(
              `/api/products/recently-viewed?ids=${recentIds.join(",")}`,
              60000,
            )
          : Promise.resolve({ success: true, products: [] }),
        fetchWithCache("/api/products/public?sort=popular&limit=6", 180000),
        fetchWithCache(
          "/api/group-buys/public?sort=participants&limit=4",
          120000,
        ),
        fetchWithCache("/api/manufacturers/public?sort=rating&limit=4", 300000),
      ]);

      setSuggestedProducts(
        suggestedData?.success ? suggestedData.products || [] : [],
      );
      setIsSuggestedPersonalized(Boolean(suggestedData?.isPersonalized));
      setRecentProducts(recentData?.success ? recentData.products || [] : []);

      setFeaturedProducts(
        productsData?.success ? productsData.products || [] : [],
      );
      setActiveGroupBuys(
        groupBuysData?.success ? groupBuysData.groupBuys || [] : [],
      );
      setFeaturedManufacturers(
        manufacturersData?.success ? manufacturersData.manufacturers || [] : [],
      );
    } catch (err) {
      console.error("Customer home fetch error:", err);
      setError("Could not load marketplace data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("Customer page - session status:", status);
    console.log("Customer page - session data:", session);
    console.log("Customer page - session.user.role:", session?.user?.role);

    if (status === "unauthenticated") {
      console.log("Unauthenticated, redirecting to login");
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      console.log("Authenticated, checking role...");
      if (session?.user?.role !== "customer") {
        console.log(
          "Not a customer, redirecting to login. Role:",
          session?.user?.role,
        );
        router.push("/auth/login");
        return;
      }
      console.log("Customer role confirmed, fetching home data");
      fetchHomeData();
    }
  }, [status, session, router, fetchHomeData]);

  const firstName = useMemo(
    () => session?.user?.name?.split(" ")[0] || "there",
    [session?.user?.name],
  );

  const handleToggleWishlist = useCallback(
    async (productId) => {
      const id = productId?.toString();
      if (!id) return;
      await toggleWishlist(id, "product");
    },
    [toggleWishlist],
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <p className="text-sm text-white/50 tracking-wide">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "customer") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-8">
        <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0c0c11] px-6 py-5 sm:px-8 sm:py-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_25%)] pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
            {/* LEFT CONTENT */}
            <div>
              <h1 className="text-3xl sm:text-3xl font-black tracking-tight leading-tight">
                Welcome back, <span className="text-white/85">{firstName}</span>
              </h1>

              <p className="mt-2 text-sm text-white/60 max-w-xl leading-6">
                Discover top products, join active group buys, and shortlist
                trusted manufacturers.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/customer/explore"
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white hover:border-[#eb9728] transition-all"
                >
                  <Image
                    src={browseProductsIcon}
                    alt="Browse Products"
                    width={30}
                    height={30}
                    className="opacity-70 group-hover:opacity-100 transition"
                  />
                  Browse Products
                </Link>
                <Link
                  href="/customer/group-buys"
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white hover:border-[#eb9728] transition-all"
                >
                  <Image
                    src={GroupBuy}
                    alt="Group Buy"
                    width={30}
                    height={30}
                    className="opacity-70 group-hover:opacity-100 transition"
                  />
                  View Group Buys
                </Link>
                <Link
                  href="/manufacturers"
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-semibold text-white/80 hover:bg-white/[0.07] hover:text-white hover:border-[#eb9728] transition-all"
                >
                  <Image
                    src={FindManufacturers}
                    alt="Find Manufacturers"
                    width={35}
                    height={35}
                    className="opacity-70 group-hover:opacity-100 transition"
                  />
                  Find Manufacturers
                </Link>
              </div>
            </div>

            {/* RIGHT IMAGE */}
            <div className="hidden lg:flex justify-end items-center">
              <div className="w-[200px] h-[200px] transition-transform duration-500 hover:scale-105">
                <Lottie
                  animationData={HomeScreenAnimation}
                  loop={true}
                  autoplay={true}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-black text-white">
              {firstName}&apos;s Workspace
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {WORKSPACE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#eb9728]/60 hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] transition-all duration-300 group-hover:border-[#eb9728]/50 group-hover:bg-[#eb9728]/10">
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={28}
                    height={28}
                    className="object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                <span className="text-sm font-black text-white transition-colors duration-300 group-hover:text-[#eb9728]">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
        {error && (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </section>
        )}

        <ContentSection
          title="Suggested For You"
          href="/customer/explore"
          linkLabel="See all"
          subtitle={
            !isSuggestedPersonalized ? "Popular picks to get you started." : ""
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedProducts.slice(0, 6).map((product) => (
              <ProductGridCard
                key={product._id}
                product={product}
                isWishlisted={wishlistSet.has(product._id?.toString())}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        </ContentSection>

        {recentProducts.length > 0 && (
          <ContentSection
            title="Recently Viewed"
            href="/customer/explore"
            linkLabel="Explore more"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProducts.slice(0, 3).map((product) => (
                <ProductGridCard
                  key={product._id}
                  product={product}
                  isWishlisted={wishlistSet.has(product._id?.toString())}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          </ContentSection>
        )}

        <ContentSection
          title="Trending Products"
          href="/customer/explore"
          linkLabel="See all"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.slice(0, 6).map((product) => (
              <ProductGridCard
                key={product._id}
                product={product}
                isWishlisted={wishlistSet.has(product._id?.toString())}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        </ContentSection>

        <ContentSection
          title="Live Group Buys"
          href="/customer/group-buys"
          linkLabel="See all"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroupBuys.slice(0, 4).map((groupBuy) => {
              const quantity = groupBuy.currentQuantity || 0;
              const nextTier = groupBuy.tiers?.find(
                (tier) => tier.minQuantity > quantity,
              );
              const unitsToNextTier = nextTier
                ? Math.max(nextTier.minQuantity - quantity, 0)
                : 0;

              return (
                <div
                  key={groupBuy._id}
                  className="rounded-[22px] border border-white/8 bg-[#0c0c11] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-white line-clamp-1">
                        {groupBuy.title ||
                          groupBuy.productId?.name ||
                          "Group Buy"}
                      </p>
                      <p className="text-xs text-white/45 mt-1 line-clamp-1">
                        {groupBuy.manufacturerId?.businessName ||
                          groupBuy.manufacturerId?.name ||
                          "Manufacturer"}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-300 border border-emerald-500/15">
                      {daysLeft(groupBuy.endDate)}d left
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#eb9728]"
                      style={{
                        width: `${Math.min(
                          100,
                          ((groupBuy.currentParticipantCount || 0) / 50) * 100,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 text-xs text-white/45 flex items-center justify-between">
                    <span>
                      {groupBuy.currentParticipantCount || 0} participants
                    </span>
                    <span className="font-bold text-[#eb9728]">
                      {currency(
                        groupBuy.currentDiscountedPrice ?? groupBuy.basePrice,
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-white/50">
                    {unitsToNextTier > 0
                      ? `${unitsToNextTier} more units to unlock next tier`
                      : "Top tier unlocked"}
                  </p>

                  <Link
                    href={`/customer/group-buys/${groupBuy._id}`}
                    className="mt-4 inline-flex px-3.5 py-2 rounded-xl text-xs font-bold bg-[#eb9728]/10 border border-[#eb9728]/20 text-[#eb9728] hover:bg-[#eb9728]/15 transition-all"
                  >
                    Open Group Buy
                  </Link>
                </div>
              );
            })}
          </div>
        </ContentSection>

        <ContentSection
          title="Featured Manufacturers"
          href="/manufacturers"
          linkLabel="See all"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredManufacturers.slice(0, 4).map((mfr) => (
              <div
                key={mfr._id}
                className="rounded-[22px] border border-white/8 bg-[#0c0c11] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#eb9728]/10 border border-[#eb9728]/20 text-[#eb9728] flex items-center justify-center font-bold">
                  {(mfr.businessName || mfr.name || "M")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <h3 className="mt-4 text-sm font-bold text-white line-clamp-1">
                  {mfr.businessName || mfr.name}
                </h3>
                <p className="mt-1 text-xs text-white/55 line-clamp-1">
                  {mfr.manufacturingCapabilities?.[0]?.replace(/_/g, " ") ||
                    "General Manufacturing"}
                </p>
                <p className="mt-1 text-xs text-white/35 line-clamp-1">
                  {mfr.businessAddress?.country ||
                    mfr.location?.country ||
                    "Global"}
                </p>
                <Link
                  href={`/manufacturers/${mfr._id}`}
                  className="mt-4 inline-flex px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.04] border border-white/10 text-white/75 hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        </ContentSection>
      </main>
    </div>
  );
}

function ContentSection({ title, href, linkLabel, subtitle, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-white/45 mt-1">{subtitle}</p>
          ) : null}
        </div>
        <Link
          href={href}
          className="text-xs font-semibold text-[#eb9728] hover:text-amber-400 transition-colors shrink-0"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function ProductGridCard({ product, isWishlisted, onToggleWishlist }) {
  const productId = product._id?.toString();

  return (
    <div className="rounded-[22px] border border-white/8 bg-[#0c0c11] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] hover:border-[#eb9728]/20 transition-all">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">
          {product.category || "General"}
        </p>
        <button
          type="button"
          onClick={() => onToggleWishlist?.(productId)}
          className={`inline-flex items-center justify-center rounded-full w-9 h-9 border transition-all ${
            isWishlisted
              ? "text-[#eb9728] border-[#eb9728]/30 bg-[#eb9728]/10"
              : "text-white/35 border-white/10 hover:text-[#eb9728] hover:border-[#eb9728]/30 hover:bg-[#eb9728]/5"
          }`}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isWishlisted ? "favorite" : "favorite_border"}
          </span>
        </button>
      </div>

      <h3 className="text-base font-bold text-white mt-3 line-clamp-1">
        {product.name}
      </h3>

      <p className="text-sm text-white/50 mt-2 line-clamp-2 min-h-[42px]">
        {product.description || "High-quality manufacturing-ready item."}
      </p>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-white/30">
            Starting at
          </p>
          <p className="text-lg font-black text-white mt-1">
            {currency(product.price)}
          </p>
        </div>
        <Link
          href={`/customer/products/${product._id}`}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#eb9728] text-white hover:bg-amber-500 transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}

// // app/customer/page.js
// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import { fetchWithCache } from "@/lib/clientCache";

// const WORKSPACE_LINKS = [
//   { href: "/customer/dashboard", icon: "monitoring", label: "Dashboard" },
//   { href: "/customer/orders", icon: "receipt_long", label: "Orders" },
//   { href: "/customer/rfqs", icon: "gavel", label: "RFQs" },
//   { href: "/customer/wishlist", icon: "favorite", label: "Wishlist" },
//   { href: "/customer/settings", icon: "settings", label: "Settings" },
//   { href: "/customer/payments", icon: "payments", label: "Payments" },
// ];

// function currency(value) {
//   if (typeof value !== "number") return "-";
//   return `$${value.toLocaleString()}`;
// }

// function daysLeft(dateString) {
//   if (!dateString) return 0;
//   const ms = new Date(dateString).getTime() - Date.now();
//   return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
// }

// export default function CustomerHomePage() {
//   const router = useRouter();
//   const { data: session, status } = useSession();

//   const [suggestedProducts, setSuggestedProducts] = useState([]);
//   const [isSuggestedPersonalized, setIsSuggestedPersonalized] = useState(true);
//   const [recentProducts, setRecentProducts] = useState([]);
//   const [featuredProducts, setFeaturedProducts] = useState([]);
//   const [activeGroupBuys, setActiveGroupBuys] = useState([]);
//   const [featuredManufacturers, setFeaturedManufacturers] = useState([]);
//   const [wishlistProductIds, setWishlistProductIds] = useState(new Set());
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const fetchHomeData = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       let recentIds = [];
//       if (typeof window !== "undefined") {
//         const storageKey = "craftit_recently_viewed_products";
//         const parsedIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
//         recentIds = Array.isArray(parsedIds)
//           ? parsedIds.filter((pId) => typeof pId === "string").slice(0, 3)
//           : [];
//       }

//       const suggestedPath = recentIds.length
//         ? `/api/products/suggested?limit=6&recentIds=${recentIds.join(",")}`
//         : "/api/products/suggested?limit=6";

//       const [
//         suggestedData,
//         recentData,
//         productsData,
//         groupBuysData,
//         manufacturersData,
//         wishlistData,
//       ] = await Promise.all([
//         fetchWithCache(suggestedPath, 60000),
//         recentIds.length
//           ? fetchWithCache(
//               `/api/products/recently-viewed?ids=${recentIds.join(",")}`,
//               60000,
//             )
//           : Promise.resolve({ success: true, products: [] }),
//         fetchWithCache("/api/products/public?sort=popular&limit=6", 180000),
//         fetchWithCache(
//           "/api/group-buys/public?sort=participants&limit=4",
//           120000,
//         ),
//         fetchWithCache("/api/manufacturers/public?sort=rating&limit=4", 300000),
//         fetch("/api/users/wishlist", { cache: "no-store" })
//           .then((res) => (res.ok ? res.json() : { wishlist: [] }))
//           .catch(() => ({ wishlist: [] })),
//       ]);

//       setSuggestedProducts(
//         suggestedData?.success ? suggestedData.products || [] : [],
//       );
//       setIsSuggestedPersonalized(Boolean(suggestedData?.isPersonalized));
//       setRecentProducts(recentData?.success ? recentData.products || [] : []);

//       setFeaturedProducts(
//         productsData?.success ? productsData.products || [] : [],
//       );
//       setActiveGroupBuys(
//         groupBuysData?.success ? groupBuysData.groupBuys || [] : [],
//       );
//       setFeaturedManufacturers(
//         manufacturersData?.success ? manufacturersData.manufacturers || [] : [],
//       );

//       const wishlistedProductIds = (wishlistData?.wishlist || [])
//         .filter((item) => item.itemType === "product" && item._id)
//         .map((item) => item._id.toString());
//       setWishlistProductIds(new Set(wishlistedProductIds));
//     } catch (err) {
//       console.error("Customer home fetch error:", err);
//       setError("Could not load marketplace data. Please try again.");
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
//       if (session?.user?.role !== "customer") {
//         router.push("/auth/login");
//         return;
//       }
//       fetchHomeData();
//     }
//   }, [status, session, router, fetchHomeData]);

//   const firstName = useMemo(
//     () => session?.user?.name?.split(" ")[0] || "there",
//     [session?.user?.name],
//   );

//   const handleToggleWishlist = useCallback(
//     async (productId) => {
//       const id = productId?.toString();
//       if (!id) return;

//       const isCurrentlyWishlisted = wishlistProductIds.has(id);

//       setWishlistProductIds((prev) => {
//         const next = new Set(prev);
//         if (isCurrentlyWishlisted) {
//           next.delete(id);
//         } else {
//           next.add(id);
//         }
//         return next;
//       });

//       try {
//         const response = await fetch("/api/users/wishlist", {
//           method: isCurrentlyWishlisted ? "DELETE" : "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ itemId: id, itemType: "product" }),
//         });

//         if (!response.ok && response.status !== 409) {
//           throw new Error("Wishlist update failed");
//         }
//       } catch (err) {
//         console.error("Wishlist update failed:", err);
//         setWishlistProductIds((prev) => {
//           const next = new Set(prev);
//           if (isCurrentlyWishlisted) {
//             next.add(id);
//           } else {
//             next.delete(id);
//           }
//           return next;
//         });
//       }
//     },
//     [wishlistProductIds],
//   );

//   if (status === "loading" || loading) {
//     return (
//       <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center">
//         <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-[#eb9728] animate-spin" />
//       </div>
//     );
//   }

//   if (status === "unauthenticated" || session?.user?.role !== "customer") {
//     return null;
//   }

//   return (
//     <div className="min-h-screen bg-linear-to-b from-[#f9fbff] via-[#f6f7fb] to-[#f3f4f7]">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-8">
//         <section className="rounded-3xl p-6 sm:p-8 bg-linear-to-r from-[#121826] via-[#1b2436] to-[#2a3248] text-white shadow-lg">
//           <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
//             Marketplace Home
//           </p>
//           <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
//             Welcome back, {firstName}
//           </h1>
//           <p className="mt-2 text-sm text-slate-300 max-w-2xl">
//             Discover top products, join active group buys, and shortlist trusted
//             manufacturers. Use your dashboard for account-specific tracking and
//             settings.
//           </p>
//           <div className="mt-5 flex flex-wrap gap-2.5">
//             <Link
//               href="/customer/explore"
//               className="px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100"
//             >
//               Browse Products
//             </Link>
//             <Link
//               href="/customer/group-buys"
//               className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20"
//             >
//               View Group Buys
//             </Link>
//             <Link
//               href="/manufacturers"
//               className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20"
//             >
//               Find Manufacturers
//             </Link>
//           </div>
//         </section>

//         <section>
//           <h2 className="text-base font-bold text-gray-900 mb-3">
//             My Workspace
//           </h2>
//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
//             {WORKSPACE_LINKS.map((item) => (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:border-[#eb9728]/40 hover:shadow transition-all"
//               >
//                 <span className="material-symbols-outlined text-[#eb9728] text-xl">
//                   {item.icon}
//                 </span>
//                 <p className="mt-2 text-sm font-semibold text-gray-900">
//                   {item.label}
//                 </p>
//               </Link>
//             ))}
//           </div>
//         </section>

//         {error && (
//           <section className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
//             {error}
//           </section>
//         )}

//         <section>
//           <div className="flex items-center justify-between mb-3">
//             <h2 className="text-base font-bold text-gray-900">
//               Suggested For You
//             </h2>
//             <Link
//               href="/customer/explore"
//               className="text-xs font-semibold text-[#eb9728] hover:underline"
//             >
//               See all
//             </Link>
//           </div>
//           {!isSuggestedPersonalized && (
//             <p className="text-xs text-gray-500 mb-3">
//               Popular picks to get you started.
//             </p>
//           )}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             {suggestedProducts.slice(0, 6).map((product) => (
//               <ProductGridCard
//                 key={product._id}
//                 product={product}
//                 isWishlisted={wishlistProductIds.has(product._id?.toString())}
//                 onToggleWishlist={handleToggleWishlist}
//               />
//             ))}
//           </div>
//         </section>

//         {recentProducts.length > 0 && (
//           <section>
//             <div className="flex items-center justify-between mb-3">
//               <h2 className="text-base font-bold text-gray-900">
//                 Recently Viewed
//               </h2>
//               <Link
//                 href="/customer/explore"
//                 className="text-xs font-semibold text-[#eb9728] hover:underline"
//               >
//                 Explore more
//               </Link>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//               {recentProducts.slice(0, 3).map((product) => (
//                 <ProductGridCard
//                   key={product._id}
//                   product={product}
//                   isWishlisted={wishlistProductIds.has(product._id?.toString())}
//                   onToggleWishlist={handleToggleWishlist}
//                 />
//               ))}
//             </div>
//           </section>
//         )}

//         <section>
//           <div className="flex items-center justify-between mb-3">
//             <h2 className="text-base font-bold text-gray-900">
//               Trending Products
//             </h2>
//             <Link
//               href="/customer/explore"
//               className="text-xs font-semibold text-[#eb9728] hover:underline"
//             >
//               See all
//             </Link>
//           </div>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             {featuredProducts.slice(0, 6).map((product) => (
//               <ProductGridCard
//                 key={product._id}
//                 product={product}
//                 isWishlisted={wishlistProductIds.has(product._id?.toString())}
//                 onToggleWishlist={handleToggleWishlist}
//               />
//             ))}
//           </div>
//         </section>

//         <section>
//           <div className="flex items-center justify-between mb-3">
//             <h2 className="text-base font-bold text-gray-900">
//               Live Group Buys
//             </h2>
//             <Link
//               href="/customer/group-buys"
//               className="text-xs font-semibold text-[#eb9728] hover:underline"
//             >
//               See all
//             </Link>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             {activeGroupBuys.slice(0, 4).map((groupBuy) => {
//               const quantity = groupBuy.currentQuantity || 0;
//               const nextTier = groupBuy.tiers?.find(
//                 (tier) => tier.minQuantity > quantity,
//               );
//               const unitsToNextTier = nextTier
//                 ? Math.max(nextTier.minQuantity - quantity, 0)
//                 : 0;

//               return (
//                 <div
//                   key={groupBuy._id}
//                   className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
//                 >
//                   <div className="flex items-start justify-between gap-3">
//                     <div>
//                       <p className="text-sm font-bold text-gray-900 line-clamp-1">
//                         {groupBuy.title ||
//                           groupBuy.productId?.name ||
//                           "Group Buy"}
//                       </p>
//                       <p className="text-xs text-gray-500 mt-1 line-clamp-1">
//                         {groupBuy.manufacturerId?.businessName ||
//                           groupBuy.manufacturerId?.name ||
//                           "Manufacturer"}
//                       </p>
//                     </div>
//                     <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
//                       {daysLeft(groupBuy.endDate)}d left
//                     </span>
//                   </div>

//                   <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
//                     <span>
//                       {groupBuy.currentParticipantCount || 0} participants
//                     </span>
//                     <span className="font-semibold text-[#eb9728]">
//                       {currency(
//                         groupBuy.currentDiscountedPrice ?? groupBuy.basePrice,
//                       )}
//                     </span>
//                   </div>

//                   <p className="mt-2 text-xs text-gray-500">
//                     {unitsToNextTier > 0
//                       ? `${unitsToNextTier} more units to unlock next tier`
//                       : "Top tier unlocked"}
//                   </p>

//                   <Link
//                     href={`/customer/group-buys/${groupBuy._id}`}
//                     className="mt-3 inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#eb9728]/10 text-[#eb9728] hover:bg-[#eb9728]/20"
//                   >
//                     Open Group Buy
//                   </Link>
//                 </div>
//               );
//             })}
//           </div>
//         </section>

//         <section>
//           <div className="flex items-center justify-between mb-3">
//             <h2 className="text-base font-bold text-gray-900">
//               Featured Manufacturers
//             </h2>
//             <Link
//               href="/manufacturers"
//               className="text-xs font-semibold text-[#eb9728] hover:underline"
//             >
//               See all
//             </Link>
//           </div>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//             {featuredManufacturers.slice(0, 4).map((mfr) => (
//               <div
//                 key={mfr._id}
//                 className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
//               >
//                 <div className="w-11 h-11 rounded-full bg-[#eb9728]/15 text-[#eb9728] flex items-center justify-center font-bold">
//                   {(mfr.businessName || mfr.name || "M")
//                     .charAt(0)
//                     .toUpperCase()}
//                 </div>
//                 <h3 className="mt-3 text-sm font-bold text-gray-900 line-clamp-1">
//                   {mfr.businessName || mfr.name}
//                 </h3>
//                 <p className="mt-1 text-xs text-gray-500 line-clamp-1">
//                   {mfr.manufacturingCapabilities?.[0]?.replace(/_/g, " ") ||
//                     "General Manufacturing"}
//                 </p>
//                 <p className="mt-1 text-xs text-gray-400 line-clamp-1">
//                   {mfr.businessAddress?.country ||
//                     mfr.location?.country ||
//                     "Global"}
//                 </p>
//                 <Link
//                   href={`/manufacturers/${mfr._id}`}
//                   className="mt-3 inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
//                 >
//                   View Profile
//                 </Link>
//               </div>
//             ))}
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// }

// function ProductGridCard({ product, isWishlisted, onToggleWishlist }) {
//   const productId = product._id?.toString();

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
//       <div className="flex items-start justify-between gap-2">
//         <p className="text-xs uppercase tracking-wide text-gray-400">
//           {product.category || "General"}
//         </p>
//         <button
//           type="button"
//           onClick={() => onToggleWishlist?.(productId)}
//           className={`inline-flex items-center justify-center rounded-full w-8 h-8 border transition-colors ${
//             isWishlisted
//               ? "text-[#eb9728] border-[#eb9728]/40 bg-[#eb9728]/10"
//               : "text-gray-400 border-gray-200 hover:text-[#eb9728] hover:border-[#eb9728]/40"
//           }`}
//           title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
//           aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
//         >
//           <span className="material-symbols-outlined text-[18px]">
//             {isWishlisted ? "favorite" : "favorite_border"}
//           </span>
//         </button>
//       </div>
//       <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">
//         {product.name}
//       </h3>
//       <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-8">
//         {product.description || "High-quality manufacturing-ready item."}
//       </p>
//       <div className="mt-3 flex items-center justify-between">
//         <div>
//           <p className="text-[11px] text-gray-400">Starting at</p>
//           <p className="text-sm font-bold text-gray-900">
//             {currency(product.price)}
//           </p>
//         </div>
//         <Link
//           href={`/customer/products/${product._id}`}
//           className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#eb9728]/10 text-[#eb9728] hover:bg-[#eb9728]/20"
//         >
//           View
//         </Link>
//       </div>
//     </div>
//   );
// }
