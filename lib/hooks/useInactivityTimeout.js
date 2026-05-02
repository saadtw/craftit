"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook to track user inactivity and trigger callbacks
 * @param {number} inactivityMinutes - Minutes before showing warning (default: 50)
 * @param {number} absoluteTimeoutMinutes - Minutes before auto-logout (default: 60)
 * @param {Function} onWarning - Callback when inactivity warning should show
 * @param {Function} onLogout - Callback when auto-logout should occur
 */
export function useInactivityTimeout({
  inactivityMinutes = 50,
  absoluteTimeoutMinutes = 60,
  onWarning = () => {},
  onLogout = () => {},
} = {}) {
  const { data: session, status } = useSession();
  const inactivityTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timeouts
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timeout (before logout)
    warningTimeoutRef.current = setTimeout(
      () => {
        onWarning();
      },
      inactivityMinutes * 60 * 1000,
    );

    // Set logout timeout
    inactivityTimeoutRef.current = setTimeout(
      () => {
        onLogout();
      },
      absoluteTimeoutMinutes * 60 * 1000,
    );
  }, [inactivityMinutes, absoluteTimeoutMinutes, onWarning, onLogout]);

  useEffect(() => {
    // Only track inactivity when authenticated
    if (status !== "authenticated") return;

    // Initialize timer on mount
    resetInactivityTimer();

    // Track user activity
    const events = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "mousemove",
    ];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [status, resetInactivityTimer]);

  return {
    resetInactivityTimer,
    lastActivity: lastActivityRef.current,
  };
}
