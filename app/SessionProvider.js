"use client";

import { useEffect } from "react";
import {
  SessionProvider as NextAuthSessionProvider,
  signOut,
  useSession,
} from "next-auth/react";

/**
 * Force a full page reload on browser Back/Forward navigation.
 *
 * Two separate mechanisms cover two separate scenarios:
 *
 * 1. `pageshow` with event.persisted === true:
 *    The browser is restoring the page from its native back-forward cache
 *    (bfcache). React state is frozen in whatever state it was in when the
 *    user navigated away — effects never re-run, fetches never fire again.
 *    Reloading forces a clean mount. (Mainly affects production / Chrome
 *    stable when bfcache is active.)
 *
 * 2. `popstate`:
 *    Fires whenever the user presses the browser Back or Forward buttons.
 *    In Next.js dev mode bfcache is disabled (dev-server cache-control
 *    headers prevent it), so pageshow.persisted is never true. Instead,
 *    Next.js intercepts the history pop and serves a cached router entry
 *    which can be stale or wrong (e.g., /manufacturers showing the landing
 *    page). Reloading on popstate forces Next.js to do a fresh server fetch
 *    for the correct URL, fixing both wrong-page and infinite-skeleton bugs.
 *
 * Tradeoff: browser Back/Forward now always triggers a hard reload instead
 * of an instant client-side transition. For this app this is acceptable.
 */
function BfcacheBuster() {
  useEffect(() => {
    // Scenario 1 — true bfcache restore (production)
    const handlePageShow = (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    // Scenario 2 — Next.js router cache / SPA history pop (dev + prod)
    const handlePopState = () => {
      window.location.reload();
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  return null;
}

function SessionInvalidGuard() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.error !== "SESSION_INVALID") return;
    signOut({ callbackUrl: "/auth/login" });
  }, [status, session]);

  return null;
}

function SessionRealtimeGuard() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const source = new EventSource("/api/auth/events");

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "SESSION_INVALIDATED") {
          signOut({ callbackUrl: "/auth/login" });
        }
      } catch {
        // Ignore malformed events.
      }
    };

    source.onerror = () => {
      // Browser auto-reconnects SSE by default.
    };

    return () => source.close();
  }, [status, session?.user?.id]);

  return null;
}

export default function SessionProvider({ children, session }) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchOnWindowFocus={true}
      refetchInterval={0}
    >
      <BfcacheBuster />
      <SessionInvalidGuard />
      <SessionRealtimeGuard />
      {children}
    </NextAuthSessionProvider>
  );
}
