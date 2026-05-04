// app/page.js
"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/CrafitLogo";
import Typewriter from "typewriter-effect";
import heroImage from "@/assets/heroSectionImage.png";
import uploadIcon from "@/assets/upload.png";
import previewIcon from "@/assets/preview.png";
import matchIcon from "@/assets/match.png";
import manufactureIcon from "@/assets/manufacture.png";
import preview3D from "@/assets/3Dpreview.png";
import smartMatch from "@/assets/smartmatch.png";
import orderIcon from "@/assets/order.png";
import bidIcon from "@/assets/bid.png";
import groupBuyIcon from "@/assets/groupbuy.png";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Capabilities", href: "#capabilities" },
  { name: "Success Stories", href: "#testimonials" },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    img: uploadIcon,
    title: "Upload",
    desc: "Upload your model and add the specifications you need. Share your project details securely with ease.",
  },
  {
    step: "02",
    img: previewIcon,
    title: "Preview",
    desc: "View your model instantly and annotate parts as required. Get a clear visualization before moving forward.",
  },
  {
    step: "03",
    img: matchIcon,
    title: "Match",
    desc: "Receive competitive RFQ bids tailored to your product. Our system finds the best manufacturers for your needs.",
  },
  {
    step: "04",
    img: manufactureIcon,
    title: "Manufacture",
    desc: "Your parts are produced with precision and quality checks. Finally, they’re shipped directly to your doorstep.",
  },
];

const CAPABILITY_CARDS = [
  {
    title: "3D Preview",
    img: preview3D,
    desc: "Interactive 3D model viewing directly in your browser for better visualization.",
    text: "3D",
  },
  {
    title: "Smart Match",
    img: smartMatch,
    desc: "Easily browse and connect with verified manufacturers that fit your exact requirements.",
    text: "MATCH",
  },
  {
    title: "Custom Orders",
    img: orderIcon,
    desc: "Request tailor-made manufacturing solutions for your unique product specifications.",
    text: "ORDER",
  },
  {
    title: "RFQ & Bidding",
    img: bidIcon,
    desc: "Submit your project details and receive competitive bids from multiple manufacturers.",
    text: "BID",
  },
  {
    title: "Group Buy",
    img: groupBuyIcon,
    desc: "Join community group buys to pool orders and unlock significant volume discounts.",
    text: "GROUP",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah L.",
    role: "Startup Founder",
    quote:
      "Craftit was a game-changer for our hardware startup. We found a fantastic local manufacturer within days and went from prototype to production in record time.",
    initial: "S",
  },
  {
    name: "Bruce C.",
    role: "Product Engineer",
    quote:
      "The platform's ability to match us with manufacturers based on our specific material and tolerance needs was incredible. The quality was top-notch.",
    initial: "B",
  },
  {
    name: "Mike T.",
    role: "Product Engineer",
    quote:
      "The quality of the final parts exceeded our expectations. Truly professional. The seamless integration made our project effortless.",
    initial: "M",
  },
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrolledRef = useRef(false);
  const activeIdxRef = useRef(0);
  const rafRef = useRef(null);

  const handleNavClick = useCallback((idx) => {
    activeIdxRef.current = idx;
    setActiveIdx(idx);
  }, []);

  const handleNavItemClick = useCallback(
    (event, idx, href) => {
      handleNavClick(idx);

      if (href === "/") {
        event.preventDefault();
        if (window.location.hash) {
          history.replaceState(null, "", "/");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (href.startsWith("#")) {
        event.preventDefault();
        const section = document.querySelector(href);
        if (!section) return;

        const headerOffset = 50;
        const targetTop =
          section.getBoundingClientRect().top + window.scrollY - headerOffset;

        history.replaceState(null, "", href);
        window.scrollTo({ top: targetTop, behavior: "smooth" });
      }
    },
    [handleNavClick],
  );

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const scrollPos = window.scrollY;
      const nextScrolled = scrollPos > 20;

      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }

      const sectionHeight = window.innerHeight - 100;
      let nextActive = 0;

      if (scrollPos < sectionHeight) {
        nextActive = 0;
      } else if (scrollPos < sectionHeight * 2) {
        nextActive = 1;
      } else if (scrollPos < sectionHeight * 3) {
        nextActive = 2;
      } else {
        nextActive = 3;
      }

      if (nextActive !== activeIdxRef.current) {
        activeIdxRef.current = nextActive;
        setActiveIdx(nextActive);
      }
    });
  }, []);

  const searchParams = useSearchParams();

  // Redirect if already logged in
  useEffect(() => {
    if (searchParams.get("noRedirect") === "true") return;

    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "customer") {
        router.replace("/customer");
      } else if (role === "manufacturer") {
        router.replace("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.replace("/admin/dashboard");
      }
    }
  }, [status, session, router, searchParams]);

  useEffect(() => {
    const prevScrollRestoration =
      "scrollRestoration" in history ? history.scrollRestoration : null;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const hash = window.location.hash;
    if (hash) {
      const section = document.querySelector(hash);
      if (section) {
        const headerOffset = 50;
        const targetTop =
          section.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: targetTop, behavior: "auto" });
      }
    } else {
      window.scrollTo(0, 0);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if ("scrollRestoration" in history && prevScrollRestoration) {
        history.scrollRestoration = prevScrollRestoration;
      }
    };
  }, [handleScroll]);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-100 dark:bg-slate-950">
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? "border-b border-white/10 bg-[#0B011D]/70 py-3 backdrop-blur-xl shadow-2xl"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-6 lg:px-12">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo className="h-8 w-8 text-amber-600 transition-transform group-hover:scale-110" />
            <h1 className="text-2xl font-black tracking-tighter text-white">
              Craftit
            </h1>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {NAV_LINKS.map((link, idx) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(event) => handleNavItemClick(event, idx, link.href)}
                className={`relative py-2 text-sm font-semibold tracking-wide transition-all duration-300 hover:text-purple-400 ${
                  activeIdx === idx ? "text-white" : "text-slate-400"
                }`}
              >
                {link.name}

                {activeIdx === idx && (
                  <span
                    className="absolute -bottom-1 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)] transition-all duration-500 ease-out"
                    style={{ transform: "translateX(-50%) scaleX(1.2)" }}
                  />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/manufacturers"
              className="hidden text-sm font-bold text-slate-300 transition-colors hover:text-amber-400 md:inline"
            >
              Browse Manufacturers
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-bold text-white transition-colors hover:text-purple-400"
            >
              Log in
            </Link>
            <Link href="/auth/signup">
              <button className="relative inline-flex h-11 items-center justify-center overflow-hidden rounded-full bg-linear-to-r from-purple-600 to-indigo-600 px-8 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-105 hover:brightness-110 active:scale-95">
                Register
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full overflow-hidden bg-[#0B011D] pt-20 pb-12 lg:pt-24 lg:pb-20">
          <div className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-amber-600/5 blur-[100px]" />

          <div className="container mx-auto grid min-h-[calc(100vh-120px)] grid-cols-1 items-center gap-8 px-6 lg:grid-cols-2 lg:px-12">
            <div className="relative z-10 flex flex-col items-start gap-6">
              <div className="animate-fade-in-up">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-5xl leading-tight">
                  <div className="flex flex-wrap items-center gap-x-3">
                    <span className="whitespace-nowrap">
                      Elevate Your Presence with
                    </span>

                    <span className="inline-block min-w-[300px] whitespace-nowrap bg-linear-to-r from-purple-400 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                      <Typewriter
                        options={{
                          strings: [
                            "Custom Products",
                            "Expertly Crafted Goods",
                            "Branded Designs",
                            "3D Prototypes",
                          ],
                          autoStart: true,
                          loop: true,
                          delay: 80,
                          deleteSpeed: 50,
                          pauseFor: 3500,
                        }}
                      />
                    </span>
                    <span className="whitespace-nowrap">
                      That Speak Your Brand&apos;s
                    </span>
                    <span className="whitespace-nowrap">Language.</span>
                  </div>
                </h1>
              </div>

              <div className="animate-fade-in-up delay-100">
                <p className="max-w-md text-base text-slate-400 leading-relaxed sm:text-lg">
                  Craftit is your global marketplace for custom manufacturing.
                  We connect innovators and engineers with the perfect
                  manufacturers to bring your designs to life effortlessly and
                  with precision.
                </p>
              </div>

              <div className="flex w-full flex-wrap gap-4 animate-fade-in-up delay-200">
                <Link
                  href="/auth/signup/customer"
                  className="flex h-12 items-center justify-center rounded-full bg-linear-to-r from-purple-600 to-indigo-600 px-8 text-sm font-bold text-white shadow-xl shadow-purple-500/20 transition-all hover:scale-105 hover:brightness-110"
                >
                  CUSTOMER SIGNUP
                </Link>
                <Link
                  href="/auth/signup/manufacturer"
                  className="flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/10"
                >
                  MANUFACTURER SIGNUP
                </Link>
              </div>
            </div>

            <div className="relative hidden justify-center lg:flex lg:justify-end animate-fade-in-up delay-200">
              <div className="relative z-10 h-[500px] w-[500px] overflow-hidden group">
                <div className="h-full w-full flex items-center justify-center transition-transform duration-700 ease-in-out group-hover:scale-110">
                  <Image
                    src={heroImage}
                    alt="Innovation Illustration"
                    width={500}
                    height={500}
                    loading="eager"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0B011D] via-transparent to-transparent opacity-40" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="relative w-full py-16 flex flex-col items-center bg-[#0B011D] overflow-hidden"
        >
          <div className="container mx-auto max-w-5xl px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
                How It <span className="text-purple-500">Works</span>
              </h2>
              <p className="mt-4 text-base md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
                A seamless journey from your design to a delivered product in
                four simple steps.
              </p>
            </div>

            <div className="relative grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              <div className="absolute top-12 left-[10%] right-[10%] z-0 hidden h-0.5 bg-linear-to-r from-transparent via-white/20 to-transparent lg:block" />

              {HOW_IT_WORKS_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="group relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:bg-purple-600/20 group-hover:border-purple-500">
                    <Image
                      src={item.img}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-contain transition-all duration-500 group-hover:brightness-125"
                    />

                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 opacity-0 scale-75 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400 max-w-[210px] mx-auto group-hover:text-slate-200 transition-colors">
                    {item.desc}
                  </p>

                  <span className="pointer-events-none absolute -top-6 select-none text-7xl font-black text-white/2 transition-colors group-hover:text-purple-500/4">
                    {item.step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="capabilities"
          className="relative w-full py-16 flex flex-col items-center bg-[#0B011D] overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[800px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

          <div className="container mx-auto flex max-w-[90rem] flex-col px-6">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl font-black text-white lg:text-5xl tracking-tight">
                Next-Gen{" "}
                <span className="bg-linear-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Capabilities
                </span>
              </h2>
              <p className="mt-3 text-slate-400 max-w-2xl mx-auto text-base opacity-80 leading-relaxed">
                A powerful suite of manufacturing tools, aligned for seamless
                execution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 pb-10">
              {CAPABILITY_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="group relative flex h-full min-h-[250px] flex-col items-center overflow-hidden rounded-[30px] border border-white/5 bg-white/3 p-6 text-center shadow-2xl backdrop-blur-md transition-all duration-500 hover:-translate-y-3 hover:border-purple-500/40 hover:bg-white/8"
                >
                  <div className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-linear-to-br from-white/10 to-transparent shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:border-purple-500/50">
                    <Image
                      src={card.img}
                      alt={card.title}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-contain transition-all duration-500 group-hover:brightness-125"
                    />
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium px-2">
                      {card.desc}
                    </p>
                  </div>

                  <div className="absolute -bottom-4 left-0 right-0 text-center opacity-[0.02] group-hover:opacity-[0.06] transition-all duration-700 select-none pointer-events-none">
                    <span className="text-5xl font-black text-white tracking-widest">
                      {card.text}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-purple-500 transition-all duration-500 group-hover:w-full" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="testimonials"
          className="relative w-full py-16 flex flex-col items-center bg-[#0B011D] overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[800px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />

          <div className="container mx-auto max-w-6xl px-6 flex flex-col">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl font-black text-white lg:text-5xl tracking-tight">
                Success Stories
              </h2>
              <p className="mt-4 text-slate-400 max-w-lg mx-auto text-base opacity-80 leading-relaxed">
                See what our customers have created with Craftit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="group relative flex h-full min-h-[250px] flex-col rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:bg-white/8"
                >
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-linear-to-br from-purple-500/20 to-indigo-500/20 shadow-inner transition-transform group-hover:scale-110">
                      <span className="text-xl font-bold text-white/40">
                        {t.initial}
                      </span>
                    </div>
                  </div>

                  <p className="mb-6 grow text-sm leading-relaxed text-slate-300">
                    &quot;{t.quote}&quot;
                  </p>

                  <div className="mt-auto">
                    <h4 className="font-bold text-white text-lg">{t.name}</h4>
                    <p className="text-sm text-slate-500 font-medium">
                      {t.role}
                    </p>
                  </div>

                  <div className="absolute bottom-0 left-10 right-10 h-0.5 bg-linear-to-r from-transparent via-purple-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative w-full overflow-hidden bg-[#0B011D] pt-20 pb-12 lg:pt-24 lg:pb-20">
          <div className="absolute inset-0 bg-linear-to-b from-[#0B011D] to-[#1a0b33]" />
          <div className="container mx-auto max-w-4xl px-6 text-center relative z-10">
            <div className="mx-auto mb-10 h-24 w-px bg-linear-to-b from-transparent to-purple-500" />
            <h2 className="text-4xl font-black text-white sm:text-5xl leading-tight">
              Ready to bring your <br />
              <span className="bg-linear-to-r from-purple-400 to-amber-500 bg-clip-text text-transparent italic">
                vision to life?
              </span>
            </h2>
            <div className="mt-12 flex justify-center">
              <Link
                href="/auth/signup"
                className="group relative flex h-16 items-center justify-center overflow-hidden rounded-full bg-white px-10 text-lg font-black text-[#0B011D] transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative z-10">Get Started Now</span>
                <div className="absolute inset-0 z-0 bg-linear-to-r from-amber-400 to-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#0B011D] py-12">
        <div className="container mx-auto max-w-7xl px-6 lg:px-12">
          <div className="flex flex-col items-center justify-between gap-10 md:flex-row">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                <Logo className="h-8 w-8 text-amber-600" />
                <span className="text-xl font-black tracking-tighter text-white">
                  Craftit
                </span>
              </div>
              <p className="max-w-60 text-center text-sm text-slate-500 md:text-left">
                Customize, Order and Grow Your Business with Craftit - Your
                Global Manufacturing Marketplace.
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-6">
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                {["About", "Contact", "Terms", "Privacy"].map((item) => (
                  <a
                    key={item}
                    className="text-sm font-medium text-slate-400 transition-all hover:-translate-y-px hover:text-purple-400"
                    href="#"
                  >
                    {item}
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden h-px w-8 bg-slate-800 md:block" />
                <p className="text-xs font-medium uppercase tracking-widest text-slate-600">
                  © 2026 Craftit Inc. <span className="mx-2">/</span> Built for
                  the Future
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
