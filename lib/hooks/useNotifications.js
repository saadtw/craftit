import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch unread notifications
 * Polls every 30 seconds by default
 *
 * @param {number} pollInterval - Polling interval in ms (default 30000)
 * @returns {Object} { notifications, unreadCount, isLoading, error, mutate }
 */
export function useNotifications(pollInterval = 30000) {
  const { data, isLoading, error, mutate } = useSWR(
    "/api/notifications?unread=true&limit=10",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: pollInterval, // Poll every N ms
      dedupingInterval: 10000, // Deduplicate within 10s
    },
  );

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return {
    notifications,
    unreadCount,
    isLoading,
    isError: !!error,
    mutate,
  };
}
