import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch and manage user wishlist
 * Automatically caches, deduplicates requests, and revalidates on focus
 *
 * @returns {Object} { wishlist, isLoading, error, mutate, toggleWishlist }
 */
export function useWishlist() {
  const { data, isLoading, error, mutate } = useSWR(
    "/api/users/wishlist",
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch when window regains focus
      revalidateOnReconnect: true, // Refetch when reconnecting to internet
      dedupingInterval: 60000, // Deduplicate requests within 1 minute
      focusThrottleInterval: 30000, // Throttle focus revalidation to 30s
    },
  );

  const wishlist = data?.wishlist || [];
  const wishlistSet = new Set(wishlist.map((item) => item._id || item.id));

  /**
   * Toggle item in/out of wishlist
   */
  const toggleWishlist = async (itemId, itemType = "product") => {
    const isWishlisted = wishlistSet.has(itemId);

    try {
      const response = await fetch("/api/users/wishlist", {
        method: isWishlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType }),
      });

      if (!response.ok && response.status !== 409) {
        throw new Error("Failed to update wishlist");
      }

      // Optimistic update: update local cache immediately
      if (isWishlisted) {
        const updatedWishlist = wishlist.filter(
          (item) => (item._id || item.id) !== itemId,
        );
        mutate({ wishlist: updatedWishlist }, false);
      } else {
        const updatedWishlist = [
          ...wishlist,
          { _id: itemId, itemType, addedAt: new Date() },
        ];
        mutate({ wishlist: updatedWishlist }, false);
      }

      // Revalidate from server after short delay
      setTimeout(() => mutate(), 500);
      return !isWishlisted;
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      // Revert optimistic update
      mutate();
      return isWishlisted;
    }
  };

  return {
    wishlist,
    wishlistSet,
    isLoading,
    isError: !!error,
    isWishlisted: (itemId) => wishlistSet.has(itemId),
    toggleWishlist,
    mutate,
  };
}
