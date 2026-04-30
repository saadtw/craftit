import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * Hook for fetching public data (products, manufacturers, group-buys)
 * Long cache duration, no frequent revalidation
 *
 * @param {string} url - API endpoint
 * @param {Object} options - SWR options
 * @returns {Object} { data, isLoading, error, mutate }
 */
export function usePublicData(url, options = {}) {
  const { data, isLoading, error, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 120000, // Deduplicate within 2 minutes
    focusThrottleInterval: 60000, // Throttle to 1 minute
    ...options,
  });

  return {
    data: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
