// app/customer/products/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { fetchWithCache } from "@/lib/clientCache";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

export default function CustomerProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [product, setProduct] = useState(null);
  const [manufacturer, setManufacturer] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [wishlistProductIds, setWishlistProductIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qaItems, setQaItems] = useState([]);
  const [qaLoading, setQaLoading] = useState(true);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);
  const [qaView, setQaView] = useState("all");

  const fetchManufacturer = useCallback(async (mId) => {
    try {
      const data = await fetchWithCache(
        `/api/manufacturers/${mId}`,
        3 * 60 * 1000,
      );
      if (data.success) setManufacturer(data.manufacturer);
    } catch (_) {}
  }, []);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithCache(
        `/api/products/${id}/public`,
        2 * 60 * 1000,
      );

      if (data.success) {
        setProduct(data.product);

        if (data.product.manufacturerId) {
          fetchManufacturer(
            data.product.manufacturerId._id || data.product.manufacturerId,
          );
        }

        try {
          const relatedRequest = fetchWithCache(
            `/api/products/${id}/related?limit=4`,
            60 * 1000,
          );

          let recentIds = [];
          if (typeof window !== "undefined") {
            const storageKey = "craftit_recently_viewed_products";
            const parsedIds = JSON.parse(
              localStorage.getItem(storageKey) || "[]",
            );
            const sanitized = Array.isArray(parsedIds)
              ? parsedIds.filter((pId) => typeof pId === "string")
              : [];

            const nextIds = [
              id,
              ...sanitized.filter((pId) => pId !== id),
            ].slice(0, 12);

            localStorage.setItem(storageKey, JSON.stringify(nextIds));
            recentIds = nextIds.filter((pId) => pId !== id).slice(0, 6);
          }

          const recentRequest = recentIds.length
            ? fetchWithCache(
                `/api/products/recently-viewed?ids=${recentIds.join(",")}`,
                60 * 1000,
              )
            : Promise.resolve({ success: true, products: [] });

          const [relatedData, recentData] = await Promise.all([
            relatedRequest,
            recentRequest,
          ]);

          setRelatedProducts(relatedData?.products || []);
          setRecentProducts(recentData?.products || []);
        } catch (_) {
          setRelatedProducts([]);
          setRecentProducts([]);
        }

        fetch(`/api/products/${id}/view`, { method: "POST" }).catch(() => {});
      } else {
        router.push("/customer/explore");
      }
    } catch (err) {
      console.error(err);
      router.push("/customer/explore");
    } finally {
      setLoading(false);
    }
  }, [id, fetchManufacturer, router]);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await fetch("/api/users/wishlist", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = await response.json();
      const ids = (data?.wishlist || [])
        .filter((item) => item.itemType === "product" && item._id)
        .map((item) => item._id.toString());

      setWishlistProductIds(new Set(ids));
    } catch (_) {}
  }, []);

  const fetchQnA = useCallback(async () => {
    setQaLoading(true);
    try {
      const res = await fetch(`/api/products/${id}/qa?status=all&limit=20`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) setQaItems(data.questions || []);
    } catch (_) {
      setQaItems([]);
    } finally {
      setQaLoading(false);
    }
  }, [id]);

  const handleAskQuestion = useCallback(async () => {
    const question = qaQuestion.trim();
    if (question.length < 5 || qaSubmitting) return;

    setQaSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (data.success) {
        setQaItems((prev) => [data.question, ...prev]);
        setQaQuestion("");
      } else {
        alert(data.error || "Failed to submit question");
      }
    } catch (_) {
      alert("Failed to submit question");
    } finally {
      setQaSubmitting(false);
    }
  }, [id, qaQuestion, qaSubmitting]);

  const handleToggleWishlist = useCallback(
    async (productId) => {
      const targetId = productId?.toString();
      if (!targetId) return;

      const isCurrentlyWishlisted = wishlistProductIds.has(targetId);

      setWishlistProductIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyWishlisted) next.delete(targetId);
        else next.add(targetId);
        return next;
      });

      try {
        const response = await fetch("/api/users/wishlist", {
          method: isCurrentlyWishlisted ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: targetId, itemType: "product" }),
        });

        if (!response.ok && response.status !== 409) {
          throw new Error("Wishlist update failed");
        }
      } catch (_) {
        setWishlistProductIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlyWishlisted) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
      }
    },
    [wishlistProductIds],
  );

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

      fetchProduct();
      fetchWishlist();
      fetchQnA();
    }
  }, [status, session, router, fetchProduct, fetchWishlist, fetchQnA]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#eb9728]" />
          <GlobalLoader text="Loading product..." />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const isCurrentProductWishlisted = wishlistProductIds.has(id?.toString());
  const specs = product.specifications || {};
  const dims = specs.dimensions || {};
  const answeredCount = qaItems.filter((q) => q.status === "answered").length;
  const pendingCount = qaItems.filter((q) => q.status !== "answered").length;

  const visibleQaItems = qaItems.filter((q) => {
    if (qaView === "answered") return q.status === "answered";
    if (qaView === "pending") return q.status !== "answered";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 space-y-8">
        <Link
          href="/customer/explore"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/45 hover:text-[#eb9728]"
        >
          <span className="material-symbols-outlined text-base">
            arrow_back
          </span>
          Back to Explore
        </Link>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-[28px] border border-white/8 bg-[#0c0c11]">
              {product.images?.[activeImage]?.url ? (
                <Image
                  src={product.images[activeImage].url}
                  alt={product.name}
                  fill
                  className="object-contain p-5 transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="material-symbols-outlined text-7xl text-white/15">
                    inventory_2
                  </span>
                </div>
              )}
            </div>

            {product.images?.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 overflow-hidden rounded-xl border-2 bg-[#0c0c11] transition-all ${
                      i === activeImage
                        ? "border-[#eb9728]"
                        : "border-white/10 hover:border-[#eb9728]/40"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{product.category}</Badge>
              {product.subCategory && (
                <Badge muted>{product.subCategory}</Badge>
              )}
              {product.customizationOptions && (
                <Badge amber>✦ Customizable</Badge>
              )}
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-tight text-white">
              {product.name}
            </h1>

            {product.totalReviews > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={`text-lg ${
                        s <= Math.round(product.averageRating)
                          ? "text-[#eb9728]"
                          : "text-white/15"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm font-bold text-white/80">
                  {product.averageRating?.toFixed(1)}
                </span>
                <span className="text-sm text-white/35">
                  ({product.totalReviews} reviews)
                </span>
              </div>
            )}

            <div className="rounded-[24px] border border-[#eb9728]/20 bg-[#0c0c11] p-5">
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#eb9728]">
                  ${product.price?.toLocaleString()}
                </span>
                <span className="text-sm text-white/35">per unit</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/55">
                <span>
                  <strong className="text-white">MOQ:</strong> {product.moq}{" "}
                  units
                </span>
                {product.leadTime && (
                  <span>
                    <strong className="text-white">Lead time:</strong>{" "}
                    {product.leadTime} days
                  </span>
                )}
                {product.stock > 0 && (
                  <span className="font-semibold text-emerald-300">
                    ✓ {product.stock} in stock
                  </span>
                )}
              </div>
            </div>

            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-white/35">
                Description
              </h3>
              <p className="whitespace-pre-line text-sm leading-7 text-white/55">
                {product.description}
              </p>
            </section>

            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs text-white/45"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleToggleWishlist(id)}
                className={`w-full rounded-xl border py-3 text-sm font-bold transition-colors ${
                  isCurrentProductWishlisted
                    ? "border-[#eb9728]/40 bg-[#eb9728]/10 text-[#eb9728]"
                    : "border-white/10 bg-white/[0.03] text-white/70 hover:border-[#eb9728]/40 hover:text-[#eb9728]"
                }`}
              >
                {isCurrentProductWishlisted
                  ? "Remove from Wishlist"
                  : "Add to Wishlist"}
              </button>

              <Link
                href={`/customer/products/${id}/order`}
                className="w-full rounded-xl bg-[#eb9728] py-3.5 text-center text-sm font-black text-white hover:bg-amber-500"
              >
                Place Order
              </Link>

              {product.customizationOptions ? (
                <Link
                  href={`/custom-orders/new?productId=${id}`}
                  className="w-full rounded-xl border border-[#eb9728]/40 bg-[#eb9728]/10 py-3.5 text-center text-sm font-bold text-[#eb9728] hover:bg-[#eb9728]/15"
                >
                  Request Custom Quote (RFQ)
                </Link>
              ) : (
                <p className="py-1 text-center text-xs text-white/35">
                  This manufacturer has not enabled customization for this
                  product.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {(specs.material || specs.weight || dims.length) && (
              <Card title="Specifications">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {specs.material && (
                    <SpecRow label="Material" value={specs.material} />
                  )}
                  {specs.weight && (
                    <SpecRow label="Weight" value={`${specs.weight} kg`} />
                  )}
                  {specs.color?.length > 0 && (
                    <SpecRow label="Colors" value={specs.color.join(", ")} />
                  )}
                  {dims.length && (
                    <SpecRow
                      label="Dimensions"
                      value={`${dims.length} × ${dims.width} × ${dims.height} ${dims.unit || "cm"}`}
                    />
                  )}
                  {product.shippingWeight && (
                    <SpecRow
                      label="Shipping Weight"
                      value={`${product.shippingWeight} kg`}
                    />
                  )}
                  {product.leadTime && (
                    <SpecRow
                      label="Lead Time"
                      value={`${product.leadTime} days`}
                    />
                  )}
                </div>
              </Card>
            )}

            {product.model3D?.url && (
              <Card title="3D Model">
                <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[#0c0c11]">
                  <Editor3DWrapper
                    modelUrl={product.model3D.url}
                    initialAnnotations={product.model3D.annotations}
                    initialCameraState={product.model3D.cameraState}
                    readOnly={true}
                  />
                  <div className="flex items-center justify-between gap-3 p-4 bg-white/[0.02] border-t border-white/8">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {product.model3D.filename || "3D Model"}
                      </p>
                      {product.model3D.fileSize && (
                        <p className="text-xs text-white/35">
                          {(product.model3D.fileSize / 1024 / 1024).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                    <a
                      href={product.model3D.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#eb9728]/10 text-[#eb9728] rounded-xl text-xs font-bold hover:bg-[#eb9728]/20 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {manufacturer && (
            <Card title="Manufacturer">
              <div className="mb-4 flex items-center gap-3">
                {manufacturer.businessLogo ? (
                  <Image
                    src={manufacturer.businessLogo}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/10 text-lg font-black text-[#eb9728]">
                    {(
                      manufacturer.businessName ||
                      manufacturer.name ||
                      "M"
                    ).charAt(0)}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-white">
                      {manufacturer.businessName || manufacturer.name}
                    </p>
                    {manufacturer.verificationStatus === "verified" && (
                      <span
                        className="material-symbols-outlined text-base text-blue-300"
                        title="Verified Manufacturer"
                      >
                        verified
                      </span>
                    )}
                  </div>

                  {manufacturer.location?.city && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/35">
                      <span className="material-symbols-outlined text-xs">
                        location_on
                      </span>
                      {manufacturer.location.city},{" "}
                      {manufacturer.location.country}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <StatPill
                  label="Orders"
                  value={
                    manufacturer.completedOrders ||
                    manufacturer.stats?.completedOrders ||
                    0
                  }
                />
                <StatPill
                  label="Rating"
                  value={
                    manufacturer.stats?.averageRating > 0
                      ? `★ ${manufacturer.stats.averageRating.toFixed(1)}`
                      : "—"
                  }
                />
              </div>

              {manufacturer.manufacturingCapabilities?.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                    Capabilities
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {manufacturer.manufacturingCapabilities
                      .slice(0, 4)
                      .map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300"
                        >
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                    {manufacturer.manufacturingCapabilities.length > 4 && (
                      <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-xs text-white/40">
                        +{manufacturer.manufacturingCapabilities.length - 4}{" "}
                        more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Link
                href={`/manufacturers/${manufacturer._id}`}
                className="block w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-center text-sm font-bold text-white/70 hover:border-[#eb9728]/40 hover:text-[#eb9728]"
              >
                View Full Profile
              </Link>
            </Card>
          )}
        </section>

        <Card title="Product Q&A">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs text-white/40">
              {qaItems.length} question{qaItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <QaTab active={qaView === "all"} onClick={() => setQaView("all")}>
              All ({qaItems.length})
            </QaTab>
            <QaTab
              active={qaView === "answered"}
              onClick={() => setQaView("answered")}
              blue
            >
              Answered ({answeredCount})
            </QaTab>
            <QaTab
              active={qaView === "pending"}
              onClick={() => setQaView("pending")}
              amber
            >
              Waiting ({pendingCount})
            </QaTab>
          </div>

          <div className="mb-5">
            <textarea
              value={qaQuestion}
              onChange={(e) => setQaQuestion(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="Ask about materials, lead time, customization, or anything else..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#eb9728] focus:outline-none"
            />

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/35">
                {qaQuestion.length}/800 · Keep your question specific for faster
                replies
              </p>

              <button
                type="button"
                onClick={handleAskQuestion}
                disabled={qaSubmitting || qaQuestion.trim().length < 5}
                className="rounded-xl bg-[#eb9728] px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {qaSubmitting ? "Submitting..." : "Ask Question"}
              </button>
            </div>
          </div>

          {qaLoading ? (
            <GlobalLoader text="Loading questions..." />
          ) : visibleQaItems.length === 0 ? (
            <p className="text-sm text-white/45">
              {qaItems.length === 0
                ? "No questions yet. Ask the first one."
                : "No questions in this view yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {visibleQaItems.map((qa) => (
                <article
                  key={qa._id}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-white">
                      Q: {qa.question}
                    </p>
                    <span className="shrink-0 text-[11px] text-white/30">
                      {new Date(qa.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {qa.status === "answered" && qa.answer?.text ? (
                    <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                      <p className="mb-1 text-xs font-bold text-blue-300">
                        A:{" "}
                        {qa.answer?.answeredBy?.businessName ||
                          qa.answer?.answeredBy?.name ||
                          "Manufacturer"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-blue-100/85">
                        {qa.answer.text}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-[#eb9728]">
                      Awaiting manufacturer response
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </Card>

        {(relatedProducts.length > 0 || recentProducts.length > 0) && (
          <div className="space-y-8">
            {relatedProducts.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">
                    Related Products
                  </h2>
                  <Link
                    href="/customer/explore"
                    className="text-sm font-semibold text-[#eb9728] hover:text-amber-400"
                  >
                    Browse more
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {relatedProducts.map((item) => (
                    <ProductMiniCard
                      key={item._id}
                      product={item}
                      isWishlisted={wishlistProductIds.has(
                        item._id?.toString(),
                      )}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>
            )}

            {recentProducts.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-black text-white">
                  Recently Viewed
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recentProducts.map((item) => (
                    <ProductMiniCard
                      key={item._id}
                      product={item}
                      isWishlisted={wishlistProductIds.has(
                        item._id?.toString(),
                      )}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Badge({ children, amber = false, muted = false }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${
        amber
          ? "border-[#eb9728]/25 bg-[#eb9728]/10 text-[#eb9728]"
          : muted
            ? "border-white/8 bg-white/[0.03] text-white/40"
            : "border-white/10 bg-white/[0.04] text-white/60"
      }`}
    >
      {children}
    </span>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6">
      <h3 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-white">
        {title}
      </h3>
      {children}
    </section>
  );
}

function QaTab({ active, onClick, children, amber = false, blue = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? amber
            ? "border-[#eb9728] bg-[#eb9728] text-white"
            : blue
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-white bg-white text-[#050507]"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:border-[#eb9728]/40 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ProductMiniCard({ product, isWishlisted, onToggleWishlist }) {
  const image =
    product.images?.find((img) => img.isPrimary) || product.images?.[0];

  return (
    <div className="group overflow-hidden rounded-[24px] border border-white/8 bg-[#0c0c11] transition-all hover:border-[#eb9728]/45 hover:bg-white/[0.025]">
      <div className="relative aspect-square bg-white/[0.04]">
        <button
          type="button"
          onClick={() => onToggleWishlist?.(product._id?.toString())}
          className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
            isWishlisted
              ? "border-[#eb9728]/40 bg-[#050507]/80 text-[#eb9728]"
              : "border-white/10 bg-[#050507]/65 text-white/65 hover:border-[#eb9728]/40 hover:text-[#eb9728]"
          }`}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <span className="material-symbols-outlined text-lg">
            {isWishlisted ? "favorite" : "favorite_border"}
          </span>
        </button>

        <Link
          href={`/customer/products/${product._id}`}
          className="block h-full"
        >
          {image?.url ? (
            <Image
              src={image.url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/15">
              <span className="material-symbols-outlined text-5xl">
                inventory_2
              </span>
            </div>
          )}
        </Link>
        {product.model3D?.url && (
          <div className="absolute bottom-3 right-3 z-10 flex h-7 items-center gap-1.5 rounded-full border border-[#eb9728]/20 bg-[#050507]/80 px-2.5 shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#eb9728]">
              3D
            </span>
          </div>
        )}
      </div>

      <Link href={`/customer/products/${product._id}`} className="block p-4">
        <p className="truncate text-xs text-white/35">{product.category}</p>

        <h3 className="mt-1 min-h-10 line-clamp-2 text-sm font-bold text-white group-hover:text-[#eb9728]">
          {product.name}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm font-black text-[#eb9728]">
            ${product.price?.toLocaleString()}
          </p>

          {product.averageRating > 0 ? (
            <p className="text-xs text-white/45">
              ★ {product.averageRating.toFixed(1)}
            </p>
          ) : (
            <p className="text-xs text-white/30">No ratings</p>
          )}
        </div>
      </Link>
    </div>
  );
}

function SpecRow({ label, value }) {
  return (
    <>
      <div className="text-white/35">{label}</div>
      <div className="font-bold text-white/80">{value}</div>
    </>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="text-xs text-white/35">{label}</p>
    </div>
  );
}
