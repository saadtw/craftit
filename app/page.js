"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─── Logo SVG ─────────────────────────────────────────────────────────────────
function CraftItLogo({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.177,14.686,21.5,4.2a3,3,0,0,1,3,0l17.323,10.485a3,3,0,0,1,1.5,2.6V30.714a3,3,0,0,1-1.5,2.6L24.5,43.8a3,3,0,0,1-3,0L4.177,33.314a3,3,0,0,1-1.5-2.6V17.286a3,3,0,0,1,1.5-2.6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="m22.5,24,14.5-8.5M22.5,24V43.5M22.5,24,9,16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = "", duration = 1600 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Scroll fade-in ───────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.08 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(endDate) {
  const calc = useCallback(() => {
    if (!endDate) return { hours: 0, minutes: 0, seconds: 0, done: true };
    const diff = new Date(endDate) - Date.now();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, done: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: false,
    };
  }, [endDate]);
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [endDate, calc]);
  return t;
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const primaryImage =
    product.images?.find((i) => i.isPrimary) || product.images?.[0];
  return (
    <Link href={`/customer/products/${product._id}`}>
      <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
        <div className="relative h-44 bg-slate-50 dark:bg-slate-700">
          {primaryImage?.url ? (
            <Image
              src={primaryImage.url}
              alt={product.name}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CraftItLogo className="h-12 w-12 text-slate-200 dark:text-slate-600" />
            </div>
          )}
          <div className="absolute top-2 left-2 bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            {product.category}
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 line-clamp-2 mb-2 leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
              ${product.price?.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">MOQ: {product.moq}</span>
          </div>
          {product.manufacturerId?.businessName && (
            <p className="text-xs text-slate-400 mt-1.5 truncate">
              by {product.manufacturerId.businessName}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Group buy card ───────────────────────────────────────────────────────────
function GroupBuyCard({ gb }) {
  const t = useCountdown(gb.endDate);
  const maxQty = gb.tiers?.[gb.tiers.length - 1]?.minQuantity || 1;
  const pct = Math.min(((gb.currentQuantity || 0) / maxQty) * 100, 100);
  const activeTier =
    gb.currentTierIndex >= 0 ? gb.tiers?.[gb.currentTierIndex] : null;
  const displayPrice = gb.currentDiscountedPrice ?? gb.basePrice;

  return (
    <Link href={`/customer/group-buys/${gb._id}`}>
      <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
        <div className="relative h-36 bg-slate-50 dark:bg-slate-700">
          {gb.productId?.images?.[0] ? (
            <Image
              src={gb.productId.images[0]}
              alt={gb.title}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CraftItLogo className="h-10 w-10 text-slate-200 dark:text-slate-600" />
            </div>
          )}
          {activeTier && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {activeTier.discountPercent}% OFF
            </div>
          )}
          {!t.done && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {t.days > 0 ? `${t.days}d ` : ""}
              {String(t.hours).padStart(2, "0")}:
              {String(t.minutes).padStart(2, "0")}:
              {String(t.seconds).padStart(2, "0")}
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 line-clamp-1 mb-2">
            {gb.title}
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-50">
              ${displayPrice?.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">
              {gb.currentParticipantCount || 0} joined
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-600 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {gb.currentQuantity || 0} / {maxQty} units
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Manufacturer card ────────────────────────────────────────────────────────
function MfrCard({ mfr }) {
  const name = mfr.businessName || mfr.name;
  const location = [mfr.businessAddress?.city, mfr.businessAddress?.country]
    .filter(Boolean)
    .join(", ");
  return (
    <Link href={`/manufacturers/${mfr._id}`}>
      <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            {mfr.businessLogo ? (
              <Image
                src={mfr.businessLogo}
                alt={name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-amber-700 dark:text-amber-400 font-black text-lg">
                {name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                {name}
              </p>
              {mfr.verificationStatus === "verified" && (
                <svg
                  className="w-4 h-4 text-blue-500 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            {location && (
              <p className="text-xs text-slate-400 truncate">{location}</p>
            )}
          </div>
        </div>
        {mfr.manufacturingCapabilities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {mfr.manufacturingCapabilities.slice(0, 2).map((c) => (
              <span
                key={c}
                className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-800 font-medium"
              >
                {c.replace(/_/g, " ")}
              </span>
            ))}
            {mfr.manufacturingCapabilities.length > 2 && (
              <span className="text-[10px] px-2 py-0.5 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-full border border-slate-100 dark:border-slate-600">
                +{mfr.manufacturingCapabilities.length - 2}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
          <span>★ {mfr.stats?.averageRating?.toFixed(1) || "—"}</span>
          <span>{mfr.stats?.completedOrders || 0} orders</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`}
    />
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, href, linkLabel }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h2>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:hover:text-amber-500 transition-colors whitespace-nowrap shrink-0 ml-4"
        >
          {linkLabel || "View all"} →
        </Link>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [groupBuys, setGroupBuys] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingGBs, setLoadingGBs] = useState(true);
  const [loadingMfrs, setLoadingMfrs] = useState(true);

  // Redirect authenticated users away from landing page
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "customer") router.push("/customer/dashboard");
      else if (role === "manufacturer") router.push("/manufacturer/dashboard");
      else if (role === "admin") router.push("/admin/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("/api/products/public?sort=popular&limit=8")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFeaturedProducts(d.products || []);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));

    fetch("/api/group-buys/public?sort=ending_soon&limit=4")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setGroupBuys(d.groupBuys || []);
      })
      .catch(() => {})
      .finally(() => setLoadingGBs(false));

    fetch("/api/manufacturers/public?sort=rating&limit=6")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setManufacturers(d.manufacturers || []);
      })
      .catch(() => {})
      .finally(() => setLoadingMfrs(false));
  }, []);

  if (status === "loading") return null;

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 flex items-center justify-between px-4 py-3.5 backdrop-blur-lg transition-all sm:px-6 lg:px-8 border-b ${scrolled ? "border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-950/90 shadow-sm" : "border-transparent bg-transparent"}`}
      >
        <div className="flex items-center gap-2.5">
          <CraftItLogo className="h-7 w-7 text-amber-600" />
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Craftit
          </span>
        </div>
        <nav className="hidden items-center gap-7 md:flex">
          {[
            { href: "#how-it-works", label: "How It Works" },
            { href: "/manufacturers", label: "Manufacturers" },
            { href: "/customer/group-buys", label: "Group Buys" },
            { href: "#capabilities", label: "Capabilities" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/auth/login">
            <button className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-slate-50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              Log in
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="hidden sm:flex h-9 px-4 items-center rounded-lg bg-amber-600 text-sm font-bold text-white hover:bg-amber-700 transition-colors shadow-sm">
              Get Started
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-slate-900 dark:bg-slate-950">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <div className="absolute -top-24 right-0 w-[700px] h-[700px] rounded-full bg-amber-500 opacity-[0.06] blur-[140px] pointer-events-none" />

          <div className="container mx-auto grid min-h-[calc(100vh-56px)] grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 relative z-10">
            {/* Left copy */}
            <div className="flex flex-col gap-7">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  B2B Custom Hardware Marketplace
                </span>
              </div>

              <h1 className="text-5xl font-extrabold tracking-tighter text-white sm:text-6xl md:text-7xl leading-none">
                From <span className="text-amber-500">Concept</span> to
                Creation,
                <br />
                Instantly.
              </h1>

              <p className="max-w-lg text-lg text-slate-400 leading-relaxed">
                Craftit connects engineers, inventors, and product teams with a
                global network of verified manufacturers. Source custom parts,
                compare bids, and track production — all in one place.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth/signup/customer"
                  className="flex h-12 items-center gap-2 rounded-lg bg-amber-600 px-7 text-base font-bold text-white shadow-lg hover:bg-amber-700 hover:scale-[1.02] transition-all duration-200"
                >
                  Start Your Custom Order
                </Link>
                <Link
                  href="/auth/signup/manufacturer"
                  className="flex h-12 items-center rounded-lg border border-slate-600 px-7 text-base font-bold text-slate-300 hover:border-slate-400 hover:text-white transition-all duration-200"
                >
                  Join as Manufacturer
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Link
                  href="/auth/signup/customer"
                  className="flex h-11 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-6 text-sm font-semibold text-slate-200 hover:border-amber-600/50 hover:bg-slate-700 transition-all sm:w-auto"
                >
                  Customer Signup
                </Link>
                <Link
                  href="/auth/signup/manufacturer"
                  className="flex h-11 w-full items-center justify-center rounded-lg border border-transparent px-6 text-sm font-semibold text-slate-500 hover:text-amber-500 transition-colors sm:w-auto"
                >
                  Manufacturer Signup →
                </Link>
              </div>
            </div>

            {/* Right visual */}
            <div className="relative flex items-center justify-center min-h-[360px]">
              <div
                className="absolute w-56 h-56 rounded-full border border-amber-500/10 animate-spin"
                style={{ animationDuration: "20s" }}
              />
              <div
                className="absolute w-72 h-72 rounded-full border border-amber-500/5 animate-spin"
                style={{
                  animationDuration: "30s",
                  animationDirection: "reverse",
                }}
              />
              <div className="absolute w-96 h-96 rounded-full border border-amber-500/3" />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <CraftItLogo className="h-40 w-40 text-amber-600 drop-shadow-2xl" />
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  Craftit
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-widest">
                  Custom Manufacturing
                </span>
              </div>
              {[
                { label: "CNC Machining", top: "10%", left: "-5%" },
                { label: "3D Printing", top: "20%", right: "-5%" },
                { label: "Sheet Metal", bottom: "25%", left: "-8%" },
                { label: "Prototyping", bottom: "15%", right: "-5%" },
              ].map((b) => (
                <div
                  key={b.label}
                  className="absolute bg-slate-800/80 border border-slate-700 backdrop-blur-sm text-xs font-medium text-slate-300 px-3 py-1.5 rounded-full shadow-lg"
                  style={{
                    top: b.top,
                    bottom: b.bottom,
                    left: b.left,
                    right: b.right,
                  }}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Stats band */}
          <div className="border-t border-white/5">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Manufacturers", target: 240, suffix: "+" },
                { label: "Products Listed", target: 1800, suffix: "+" },
                { label: "Orders Completed", target: 5200, suffix: "+" },
                { label: "Avg. Response", target: 4, suffix: "h" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-black text-white">
                    <AnimatedNumber target={s.target} suffix={s.suffix} />
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-widest">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="py-20 sm:py-24 bg-slate-100 dark:bg-slate-950"
        >
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-14">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                  How Craftit Works
                </h2>
                <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
                  From idea to manufactured part in three steps.
                </p>
              </div>
            </FadeIn>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Browse or Request",
                  body: "Explore active product listings or submit a fully custom RFQ with your exact specs, materials, and tolerances.",
                  d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
                },
                {
                  step: "02",
                  title: "Compare Bids",
                  body: "Manufacturers bid on your RFQ. Review proposals side-by-side — price, timeline, capability — and negotiate directly.",
                  d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
                },
                {
                  step: "03",
                  title: "Order & Track",
                  body: "Accept a bid, place your order, and track every production milestone in real time with built-in messaging.",
                  d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
                },
              ].map((item, i) => (
                <FadeIn key={item.step} delay={i * 100}>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-600/10 flex items-center justify-center shrink-0">
                        <svg
                          className="w-5 h-5 text-amber-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d={item.d}
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Featured Products ─────────────────────────────────────────── */}
        <section className="py-16 bg-white dark:bg-slate-900">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <SectionHeader
                title="Featured Products"
                subtitle="Ready-to-order hardware from verified manufacturers."
                href="/customer/explore"
                linkLabel="Browse all products"
              />
            </FadeIn>
            {loadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
                  >
                    <Skeleton className="h-44 rounded-none" />
                    <div className="p-4 space-y-2 bg-white dark:bg-slate-800">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredProducts.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-sm">
                No products available yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {featuredProducts.map((p, i) => (
                  <FadeIn key={p._id} delay={i * 40}>
                    <ProductCard product={p} />
                  </FadeIn>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Group Buys ────────────────────────────────────────────────── */}
        {(loadingGBs || groupBuys.length > 0) && (
          <section className="py-16 bg-slate-100 dark:bg-slate-950">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <FadeIn>
                <SectionHeader
                  title="Active Group Buys"
                  subtitle="Join buyers, unlock tier discounts — limited time campaigns."
                  href="/customer/group-buys"
                  linkLabel="View all group buys"
                />
              </FadeIn>
              {loadingGBs ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <Skeleton className="h-36 rounded-none" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-1.5 w-full rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {groupBuys.map((gb, i) => (
                    <FadeIn key={gb._id} delay={i * 60}>
                      <GroupBuyCard gb={gb} />
                    </FadeIn>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Capabilities ──────────────────────────────────────────────── */}
        <section id="capabilities" className="py-16 bg-white dark:bg-slate-900">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                  Manufacturing Capabilities
                </h2>
                <p className="mt-3 text-slate-500 dark:text-slate-400">
                  Our network covers the full spectrum of hardware production.
                </p>
              </div>
            </FadeIn>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: "CNC Machining", icon: "⚙️", cap: "CNC_Machining" },
                { label: "3D Printing", icon: "🖨️", cap: "3D_Printing" },
                {
                  label: "Injection Molding",
                  icon: "🧩",
                  cap: "Injection_Molding",
                },
                { label: "Sheet Metal", icon: "🔩", cap: "Sheet_Metal" },
                { label: "Casting", icon: "🏭", cap: "Casting" },
                { label: "Welding", icon: "🔧", cap: "Welding" },
                { label: "Assembly", icon: "🔨", cap: "Assembly" },
                { label: "Finishing", icon: "✨", cap: "Finishing" },
                { label: "Prototyping", icon: "📐", cap: "Prototyping" },
                {
                  label: "Mass Production",
                  icon: "📦",
                  cap: "Mass_Production",
                },
              ].map((cap, i) => (
                <FadeIn key={cap.label} delay={i * 40}>
                  <Link href={`/manufacturers?capability=${cap.cap}`}>
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 dark:hover:border-amber-600/50 transition-all duration-200 cursor-pointer group">
                      <div className="text-3xl mb-2">{cap.icon}</div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors leading-snug">
                        {cap.label}
                      </p>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Manufacturers ─────────────────────────────────────────────── */}
        {(loadingMfrs || manufacturers.length > 0) && (
          <section className="py-16 bg-slate-100 dark:bg-slate-950">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <FadeIn>
                <SectionHeader
                  title="Top Manufacturers"
                  subtitle="Trusted partners with proven track records."
                  href="/manufacturers"
                  linkLabel="View all manufacturers"
                />
              </FadeIn>
              {loadingMfrs ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {manufacturers.map((m, i) => (
                    <FadeIn key={m._id} delay={i * 60}>
                      <MfrCard mfr={m} />
                    </FadeIn>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Testimonials ──────────────────────────────────────────────── */}
        <section id="testimonials" className="py-20 bg-white dark:bg-slate-900">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mb-16 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                  Success Stories
                </h2>
                <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
                  See what our customers have created with Craftit.
                </p>
              </div>
            </FadeIn>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  name: "Sarah L.",
                  role: "Startup Founder",
                  initial: "S",
                  quote:
                    "Craftit was a game-changer for our hardware startup. We found a fantastic local manufacturer within days and went from prototype to production in record time.",
                },
                {
                  name: "Mike T.",
                  role: "Product Engineer",
                  initial: "M",
                  quote:
                    "The platform's ability to match us with manufacturers based on our specific material and tolerance needs was incredible. The quality of the final parts exceeded our expectations.",
                },
              ].map((t, i) => (
                <FadeIn key={t.name} delay={i * 100}>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-8 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold shrink-0">
                        {t.initial}
                      </div>
                      <div>
                        <p className="text-base text-slate-500 dark:text-slate-400">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                        <h3 className="mt-4 font-bold text-slate-900 dark:text-slate-50">
                          {t.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {t.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────────────────────── */}
        <section className="py-20 sm:py-24 bg-amber-600/5 dark:bg-slate-800">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                Ready to bring your idea to life?
              </h2>
              <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
                Join Craftit, upload your design, and get instant quotes from
                our network of top manufacturers today.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/auth/signup"
                  className="flex h-14 items-center rounded-lg bg-amber-600 px-8 text-base font-bold text-white shadow-lg hover:bg-amber-700 hover:scale-105 transition-all duration-200"
                >
                  Get Started Now
                </Link>
                <Link
                  href="/manufacturers"
                  className="flex h-14 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 text-base font-bold text-slate-700 dark:text-slate-200 hover:border-amber-600/50 transition-all duration-200"
                >
                  Browse Manufacturers
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <CraftItLogo className="h-6 w-6 text-amber-600" />
              <span className="font-extrabold text-slate-900 dark:text-slate-50">
                Craftit
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { href: "/manufacturers", label: "Manufacturers" },
                { href: "/customer/explore", label: "Products" },
                { href: "/customer/group-buys", label: "Group Buys" },
                { href: "#", label: "About" },
                { href: "#", label: "Contact" },
                { href: "#", label: "Terms of Service" },
                { href: "#", label: "Privacy Policy" },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} Craftit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
