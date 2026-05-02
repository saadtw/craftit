"use client";

import { useEffect, useState } from "react";
import {
  SessionProvider as NextAuthSessionProvider,
  signOut,
  useSession,
} from "next-auth/react";
import { useInactivityTimeout } from "@/lib/hooks/useInactivityTimeout";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";

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

function SessionGuards() {
  const { data: session, status } = useSession();
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityWarningTimeLeft, setInactivityWarningTimeLeft] =
    useState(600); // 10 minutes warning before logout

  // Constants for inactivity timeout (in minutes)
  const INACTIVITY_WARNING_MINUTES = 55; // Show warning after 55 minutes of inactivity
  const ABSOLUTE_TIMEOUT_MINUTES = 60; // Auto logout after 60 minutes

  const handleInactivityWarning = () => {
    setShowInactivityWarning(true);
    setInactivityWarningTimeLeft(
      (ABSOLUTE_TIMEOUT_MINUTES - INACTIVITY_WARNING_MINUTES) * 60,
    );
  };

  const handleInactivityLogout = () => {
    setShowInactivityWarning(false);
    signOut({ callbackUrl: "/auth/login" });
  };

  const handleExtendSession = () => {
    setShowInactivityWarning(false);
    // The hook will automatically reset the timers on next user activity
  };

  // Track inactivity
  useInactivityTimeout({
    inactivityMinutes: INACTIVITY_WARNING_MINUTES,
    absoluteTimeoutMinutes: ABSOLUTE_TIMEOUT_MINUTES,
    onWarning: handleInactivityWarning,
    onLogout: handleInactivityLogout,
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.error !== "SESSION_INVALID") return;
    signOut({ callbackUrl: "/auth/login" });
  }, [status, session]);

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

  return (
    <>
      <InactivityWarningModal
        isOpen={showInactivityWarning}
        onExtend={handleExtendSession}
        remainingSeconds={inactivityWarningTimeLeft}
      />
    </>
  );
}

export default function SessionProvider({ children, session }) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <BfcacheBuster />
      <SessionGuards />
      {children}
    </NextAuthSessionProvider>
  );
}
