"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";

function SupabaseCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      const flow = searchParams.get("flow") || "login";
      const code = searchParams.get("code");
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const hashError =
        hashParams.get("error_description") || hashParams.get("error");
      const hashAccessToken = hashParams.get("access_token");
      const oauthError =
        searchParams.get("error_description") || searchParams.get("error");

      if (oauthError || hashError) {
        if (isMounted) setError(oauthError || hashError);
        return;
      }

      let accessToken = "";

      if (code) {
        const { data: exchangeData, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          if (isMounted) setError(exchangeError.message || "OAuth failed.");
          return;
        }

        accessToken = exchangeData?.session?.access_token || "";
      } else if (hashAccessToken) {
        accessToken = hashAccessToken;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData?.session?.access_token || "";
        if (!accessToken) {
          if (isMounted) setError("Missing OAuth code.");
          return;
        }
      }

      const signInResult = await signIn("supabase", {
        accessToken,
        redirect: false,
      });

      if (signInResult?.error) {
        if (isMounted) setError(signInResult.error);
        return;
      }

      const nextSession = await getSession();
      const needsPasswordSetup = !!nextSession?.user?.needsPasswordSetup;
      const role = nextSession?.user?.role || "customer";

      if (flow === "manufacturer") {
        router.replace("/auth/manufacturer-google-onboarding");
        return;
      }

      if (needsPasswordSetup) {
        router.replace("/auth/setup-password");
        return;
      }

      if (role === "manufacturer") {
        router.replace("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/customer");
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  if (!error) {
    return (
      <div className="min-h-screen bg-[#0B011D] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B011D] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-sm font-bold text-red-400 mb-2">
          Google sign-in failed
        </p>
        <p className="text-xs text-red-300/80">{error}</p>
      </div>
    </div>
  );
}

export default function SupabaseCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B011D] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SupabaseCallbackContent />
    </Suspense>
  );
}
