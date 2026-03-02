"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "customer") {
        router.push("/customer/dashboard");
      } else if (role === "manufacturer") {
        router.push("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 flex items-center justify-between border-b px-4 py-4 backdrop-blur-lg transition-all sm:px-6 lg:px-8 ${
          scrolled
            ? "border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-950/80"
            : "border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-950/80"
        }`}
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-8 w-8 text-amber-600"
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Craftit
          </h1>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a
            className="text-sm font-medium text-slate-500 transition-colors hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600"
            href="#how-it-works"
          >
            How It Works
          </a>
          <a
            className="text-sm font-medium text-slate-500 transition-colors hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600"
            href="#capabilities"
          >
            Capabilities
          </a>
          <a
            className="text-sm font-medium text-slate-500 transition-colors hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600"
            href="#testimonials"
          >
            Success Stories
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/auth/login">
            <button className="flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-50 dark:hover:bg-slate-800">
              <span className="truncate">Log in</span>
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="hidden sm:flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-md bg-amber-600 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-700">
              <span className="truncate">Join Our App</span>
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
          <div className="container mx-auto grid min-h-[calc(100vh-81px)] grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="flex flex-col items-start gap-8">
              <div className="animate-fade-in-up">
                <h1 className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-slate-50 sm:text-6xl md:text-7xl">
                  From <span className="text-amber-600">Concept</span> to
                  Creation, Instantly.
                </h1>
              </div>
              <div className="animate-fade-in-up animation-delay-200">
                <p className="max-w-xl text-lg text-slate-500 dark:text-slate-400 sm:text-xl">
                  Craftit is your global marketplace for custom manufacturing.
                  We connect innovators and engineers with the perfect
                  manufacturers to bring your designs to life—effortlessly and
                  with precision.
                </p>
              </div>
              <div className="flex w-full flex-col gap-4 sm:flex-row animate-fade-in-up animation-delay-400">
                <Link
                  className="group flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-8 text-base font-bold text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-amber-700 sm:w-auto"
                  href="/auth/signup/customer"
                >
                  <span>Start Your Custom Order</span>
                </Link>
              </div>
              <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center animate-fade-in-up animation-delay-600">
                <Link
                  className="flex h-12 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-base font-bold text-slate-900 shadow-sm transition-all duration-200 hover:border-amber-600/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:border-amber-600/50 sm:w-auto"
                  href="/auth/signup/customer"
                >
                  Customer Signup
                </Link>
                <Link
                  className="flex h-12 w-full items-center justify-center rounded-lg border border-transparent px-6 text-base font-bold text-slate-500 transition-colors duration-200 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 sm:w-auto"
                  href="/auth/signup/manufacturer"
                >
                  Manufacturer Signup
                </Link>
              </div>
            </div>
            <div className="relative h-full min-h-[300px] w-full animate-fade-in-up animation-delay-400 lg:min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="group relative h-48 w-48 sm:h-64 sm:w-64">
                  <svg
                    className="relative z-10 h-full w-full text-amber-600 transition-transform duration-500 group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 48 48"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.177,14.686,21.5,4.2a3,3,0,0,1,3,0l17.323,10.485a3,3,0,0,1,1.5,2.6V30.714a3,3,0,0,1-1.5,2.6L24.5,43.8a3,3,0,0,1-3,0L4.177,33.314a3,3,0,0,1-1.5-2.6V17.286a3,3,0,0,1,1.5-2.6Z"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                    <path
                      d="m22.5,24,14.5-8.5M22.5,24V43.5M22.5,24,9,16"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          className="bg-white dark:bg-slate-800 py-20 sm:py-24"
          id="how-it-works"
        >
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
                A seamless journey from your design to a delivered product in
                four simple steps.
              </p>
            </div>
            <div className="relative grid gap-y-12 md:grid-cols-4 md:gap-x-8">
              <div className="relative flex flex-col items-center text-center group">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-3xl font-bold text-amber-600 transition-all duration-300 group-hover:border-amber-600 group-hover:bg-amber-600/10 dark:border-slate-700 dark:bg-slate-950 dark:group-hover:bg-amber-600/10">
                  <span className="text-2xl">📤</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Upload
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Submit your 3D models and detailed project specifications
                  securely.
                </p>
              </div>
              <div className="relative flex flex-col items-center text-center group">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-3xl font-bold text-amber-600 transition-all duration-300 group-hover:border-amber-600 group-hover:bg-amber-600/10 dark:border-slate-700 dark:bg-slate-950 dark:group-hover:bg-amber-600/10">
                  <span className="text-2xl">👁️</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Preview
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Visualize your design and get instant, data-driven price
                  quotes.
                </p>
              </div>
              <div className="relative flex flex-col items-center text-center group">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-3xl font-bold text-amber-600 transition-all duration-300 group-hover:border-amber-600 group-hover:bg-amber-600/10 dark:border-slate-700 dark:bg-slate-950 dark:group-hover:bg-amber-600/10">
                  <span className="text-2xl">🔗</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Match
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Our AI connects you with perfectly matched, vetted
                  manufacturers.
                </p>
              </div>
              <div className="relative flex flex-col items-center text-center group">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-3xl font-bold text-amber-600 transition-all duration-300 group-hover:border-amber-600 group-hover:bg-amber-600/10 dark:border-slate-700 dark:bg-slate-950 dark:group-hover:bg-amber-600/10">
                  <span className="text-2xl">⚙️</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Manufacture
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Your parts are produced, quality-checked, and shipped to you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section
          className="bg-slate-100 dark:bg-slate-950 py-20 sm:py-24"
          id="capabilities"
        >
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                Featured Capabilities
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500 dark:text-slate-400">
                Leverage our core platform features for a superior manufacturing
                experience.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600">
                    <span className="text-3xl">🔄</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-slate-50">
                    3D Image Visualization
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Interact with your uploaded models in a high-fidelity 3D
                    viewer, ensuring every detail is perfect before production.
                  </p>
                </div>
              </div>
              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-slate-50">
                    Smart Manufacturer Matchmaking
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Our intelligent algorithm analyzes your project requirements
                    to connect you with the ideal manufacturing partners.
                  </p>
                </div>
              </div>
              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600">
                    <span className="text-3xl">🛒</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-slate-50">
                    Custom Product Ordering
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Streamline your procurement process with our integrated
                    ordering system, from quote to final delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is Craftit */}
        <section
          className="bg-white dark:bg-slate-800 py-20 sm:py-24"
          id="what-is-craftit"
        >
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                What is Craftit?
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500 dark:text-slate-400">
                The core principles that drive our mission to revolutionize
                custom manufacturing.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="text-center p-8 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-950 transition-all duration-300">
                <div className="flex justify-center items-center h-16 w-16 rounded-full bg-amber-600/10 text-amber-600 mx-auto mb-6">
                  <span className="text-3xl">📦</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Empowering Custom Creation
                </h3>
                <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                  We provide the tools and platform for innovators, engineers,
                  and entrepreneurs to bring their unique ideas to life,
                  regardless of complexity or scale.
                </p>
              </div>
              <div className="text-center p-8 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-950 transition-all duration-300">
                <div className="flex justify-center items-center h-16 w-16 rounded-full bg-amber-600/10 text-amber-600 mx-auto mb-6">
                  <span className="text-3xl">🤝</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Seamless Manufacturer Matching
                </h3>
                <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                  Our intelligent platform connects buyers with a curated
                  network of skilled manufacturers, ensuring the right expertise
                  for every project.
                </p>
              </div>
              <div className="text-center p-8 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-950 transition-all duration-300">
                <div className="flex justify-center items-center h-16 w-16 rounded-full bg-amber-600/10 text-amber-600 mx-auto mb-6">
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Built on Trust & Transparency
                </h3>
                <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                  We foster a reliable ecosystem with secure payments, clear
                  communication channels, and a review system to maintain high
                  standards of quality.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section
          className="bg-slate-100 dark:bg-slate-950 py-20 sm:py-24"
          id="testimonials"
        >
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                Success Stories
              </h2>
              <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
                See what our customers have created with Craftit.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div>
                    <p className="text-base text-slate-500 dark:text-slate-400">
                      &quot;Craftit was a game-changer for our hardware startup.
                      We found a fantastic local manufacturer within days and
                      went from prototype to production in record time.&quot;
                    </p>
                    <h3 className="mt-4 font-bold text-slate-900 dark:text-slate-50">
                      Sarah L.
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Startup Founder
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div>
                    <p className="text-base text-slate-500 dark:text-slate-400">
                      &quot;The platform&apos;s ability to match us with
                      manufacturers based on our specific material and tolerance
                      needs was incredible. The quality of the final parts
                      exceeded our expectations.&quot;
                    </p>
                    <h3 className="mt-4 font-bold text-slate-900 dark:text-slate-50">
                      Mike T.
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Product Engineer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-24 bg-amber-600/5 dark:bg-slate-800">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Ready to bring your idea to life?
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Join Craftit, upload your design, and get instant quotes from our
              network of top manufacturers today.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                className="flex h-14 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-amber-600 px-8 text-base font-bold text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-amber-700"
                href="/auth/signup"
              >
                <span className="truncate">Get Started Now</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <a
                className="text-sm text-slate-500 transition-colors hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600"
                href="#"
              >
                About
              </a>
              <a
                className="text-sm text-slate-500 transition-colors hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600"
                href="#"
              >
                Contact
              </a>
              <a
                className="text-sm text-slate-500 transition-colors hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600"
                href="#"
              >
                Terms of Service
              </a>
              <a
                className="text-sm text-slate-500 transition-colors hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600"
                href="#"
              >
                Privacy Policy
              </a>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © 2024 Craftit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
