"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [groupBuys, setGroupBuys] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);

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
      fetchHomeData();
    }
  }, [status, session, router]);

  const fetchHomeData = async () => {
    try {
      const groupBuysRes = await fetch("/api/group-buys?limit=3");
      const groupBuysData = await groupBuysRes.json();
      if (groupBuysData.success) setGroupBuys(groupBuysData.groupBuys || []);

      // Products and manufacturers catalogs are not yet available for customers
      setFeaturedProducts([]);
      setManufacturers([]);
    } catch (error) {
      console.error("Error fetching home data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (session?.user?.role !== "customer") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#FFF7ED]/80 backdrop-blur-sm border-b border-gray-200">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/customer" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F97316] rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">Craftit</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/customer"
                className="text-sm font-semibold text-[#F97316]"
              >
                Home
              </Link>
              <Link
                href="/customer/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-[#F97316]"
              >
                Dashboard
              </Link>
              <Link
                href="/customer/custom-orders"
                className="text-sm font-medium text-gray-600 hover:text-[#F97316]"
              >
                Custom Orders
              </Link>
              <Link
                href="/customer/orders"
                className="text-sm font-medium text-gray-600 hover:text-[#F97316]"
              >
                My Orders
              </Link>
              <Link
                href="/customer/rfqs"
                className="text-sm font-medium text-gray-600 hover:text-[#F97316]"
              >
                My RFQs
              </Link>
              <Link
                href="/customer/explore"
                className="text-sm font-medium text-gray-600 hover:text-[#F97316]"
              >
                Explore Products
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <>
                <button
                  onClick={() =>
                    router.push(
                      session.user.role === "customer"
                        ? "/custom-orders/new"
                        : "/manufacturer/dashboard",
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#F97316] text-white rounded-lg shadow-sm hover:bg-orange-600"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Custom Order
                </button>
                <button className="p-2 text-gray-600 hover:text-[#F97316] rounded-full">
                  <span className="material-symbols-outlined">
                    notifications
                  </span>
                </button>
                <Link
                  href={
                    session.user.role === "customer"
                      ? "/customer/dashboard"
                      : "/manufacturer/dashboard"
                  }
                >
                  <div className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center font-semibold text-sm">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-600 hover:text-[#F97316]"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 text-sm font-semibold bg-[#F97316] text-white rounded-lg hover:bg-orange-600"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="grow container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="bg-[#FFF7ED] p-8 rounded-lg mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}!
          </h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Ready to bring your ideas to life? Explore unique creations, join
            group buys, or start your own custom project. Let&apos;s make
            something amazing together.
          </p>
          <div className="mt-6 relative max-w-lg">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              search
            </span>
            <input
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-[#F97316] focus:border-[#F97316]"
              placeholder="Search for products, manufacturers, or group buys"
              type="text"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="col-span-1 lg:pr-8">
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 text-sm text-gray-700">
                    <input
                      checked
                      readOnly
                      className="h-4 w-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316]"
                      type="checkbox"
                    />
                    <span>On demand</span>
                  </label>
                  <label className="flex items-center space-x-3 text-sm text-gray-700">
                    <input
                      className="h-4 w-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316]"
                      type="checkbox"
                    />
                    <span>Group Buys</span>
                  </label>
                  <label className="flex items-center space-x-3 text-sm text-gray-700">
                    <input
                      className="h-4 w-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316]"
                      type="checkbox"
                    />
                    <span>Ready to Ship</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Category</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 text-sm text-gray-700">
                    <input
                      checked
                      readOnly
                      className="h-4 w-4 border-gray-300 text-[#F97316] focus:ring-[#F97316]"
                      name="category"
                      type="radio"
                    />
                    <span>CNC Machining</span>
                  </label>
                  <label className="flex items-center space-x-3 text-sm text-gray-700">
                    <input
                      className="h-4 w-4 border-gray-300 text-[#F97316] focus:ring-[#F97316]"
                      name="category"
                      type="radio"
                    />
                    <span>3D Printing</span>
                  </label>
                  <label className="flex items-center space-x-3 text-sm text-gray-700">
                    <input
                      className="h-4 w-4 border-gray-300 text-[#F97316] focus:ring-[#F97316]"
                      name="category"
                      type="radio"
                    />
                    <span>Injection Molding</span>
                  </label>
                  <label className="flex items-center space-x-3 text-sm text-gray-700">
                    <input
                      className="h-4 w-4 border-gray-300 text-[#F97316] focus:ring-[#F97316]"
                      name="category"
                      type="radio"
                    />
                    <span>Sheet Metal</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="col-span-1 lg:col-span-3 space-y-10">
            {/* Featured Products */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Featured Custom Creation
                </h2>
                <Link
                  href="/products"
                  className="text-sm font-semibold text-[#F97316] hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {featuredProducts.map((product) => (
                  <div
                    key={product._id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                  >
                    <div className="w-full h-40 bg-gray-200 rounded-md mb-4"></div>
                    <h4 className="font-semibold text-gray-900">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      By{" "}
                      {product.manufacturerId?.businessName || "Manufacturer"}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-sm text-gray-600">
                        From{" "}
                        <span className="font-bold text-gray-900">
                          ${product.price}
                        </span>
                      </p>
                      <button className="px-4 py-2 text-sm font-semibold bg-[#F97316] text-white rounded-lg hover:bg-orange-600">
                        Customize
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Group Buys */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Ongoing Group Buys
                </h2>
                <Link
                  href="/group-buys"
                  className="text-sm font-semibold text-[#F97316] hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {groupBuys.map((groupBuy) => (
                  <div
                    key={groupBuy._id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center gap-4"
                  >
                    <div className="w-full sm:w-32 h-32 bg-gray-200 rounded-md"></div>
                    <div className="grow">
                      <h4 className="font-semibold text-gray-900">
                        {groupBuy.productId?.name || "Group Buy"}
                      </h4>
                      <p className="text-sm font-medium text-green-600">
                        Save 20% with Group Buy!
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            group
                          </span>
                          {groupBuy.currentParticipants || 0} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>
                          7 days left
                        </span>
                      </div>
                    </div>
                    <button className="w-full sm:w-auto px-6 py-2 text-sm font-semibold bg-[#F97316]/10 text-[#F97316] rounded-lg hover:bg-[#F97316]/20">
                      Join Buy
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Manufacturers */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Featured Manufacturers
                </h2>
                <Link
                  href="/manufacturers"
                  className="text-sm font-semibold text-[#F97316] hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {manufacturers.map((mfr) => (
                  <div
                    key={mfr._id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center"
                  >
                    <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full mx-auto flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-3xl">
                        view_in_ar
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      {mfr.businessName || mfr.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {mfr.manufacturingCapabilities?.[0] || "Manufacturing"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="bg-orange-100 p-8 rounded-lg text-center">
              <div className="w-16 h-16 bg-[#F97316]/20 text-[#F97316] rounded-full mx-auto flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">
                  upload_file
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Have a model to manufacture?
              </h2>
              <p className="text-gray-600 mt-2 max-w-lg mx-auto">
                Upload your 3D model to get instant quotes from our network of
                expert manufacturers.
              </p>
              <button
                onClick={() =>
                  router.push(
                    status === "authenticated"
                      ? "/custom-orders/new"
                      : "/auth/login",
                  )
                }
                className="mt-6 px-6 py-3 text-base font-semibold bg-[#F97316] text-white rounded-lg shadow-sm hover:bg-orange-600"
              >
                Upload a Model
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
