"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastProvider";
import { useDialog } from "@/components/ui/DialogProvider";
import GlobalLoader from "@/components/ui/GlobalLoader";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";

export default function SecuritySettingsPage() {
  const toast = useToast();
  const dialog = useDialog();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/auth/me")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setIs2FAEnabled(!!data.user.twoFactorEnabled);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  const handleToggle2FA = async () => {
    if (is2FAEnabled) {
      if (!(await dialog.confirm("Disable 2FA", "Are you sure you want to disable Two-Factor Authentication? This will reduce your account security."))) return;
      try {
        const res = await fetch("/api/auth/2fa/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enable: false })
        });
        const data = await res.json();
        if (data.success) {
          setIs2FAEnabled(false);
          toast.success("2FA disabled successfully");
        } else {
          toast.error("Error: " + data.error);
        }
      } catch (err) {
        toast.error("Error: " + err.message);
      }
    } else {
      try {
        const res = await fetch("/api/auth/2fa/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enable: true })
        });
        const data = await res.json();
        if (data.success) {
          setShowOTPInput(true);
          toast.info("An OTP has been sent to your email to confirm 2FA setup");
        } else {
          toast.error("Error: " + data.error);
        }
      } catch (err) {
        toast.error("Error: " + err.message);
      }
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: otp })
      });
      const data = await res.json();
      if (data.success) {
        setIs2FAEnabled(true);
        setShowOTPInput(false);
        setOtp("");
        toast.success("2FA enabled successfully");
      } else {
        toast.error("Invalid OTP or error: " + data.error);
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  if (loading || status === "loading") return <GlobalLoader fullScreen text="Loading Security Settings..." />;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <CustomerMainNavbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-black tracking-tight mb-8">Security Settings</h1>

        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-2">Two-Factor Authentication (2FA)</h2>
              <p className="text-sm text-white/50 max-w-xl">
                Protect your account with an extra layer of security. Once configured, you&apos;ll be required to enter both your password and an authentication code from your email to sign in.
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${is2FAEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
              {is2FAEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-6">
            <p className="text-sm font-semibold mb-4">
              Two-factor authentication is currently <span className={is2FAEnabled ? "text-emerald-400" : "text-white/40"}>{is2FAEnabled ? "enabled" : "disabled"}</span>.
            </p>
            
            {!showOTPInput ? (
              <button 
                onClick={handleToggle2FA} 
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${is2FAEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#eb9728] text-white hover:bg-[#eb9728]/80'}`}
              >
                {is2FAEnabled ? "Disable 2FA" : "Enable 2FA"}
              </button>
            ) : (
              <div className="space-y-4 max-w-sm">
                <p className="text-xs text-white/50">Enter the OTP sent to your email to confirm activation.</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value)} 
                    placeholder="Enter OTP" 
                    className="flex-1 bg-[#050507] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#eb9728]"
                  />
                  <button onClick={handleVerifyOTP} className="px-5 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 text-sm">Verify</button>
                </div>
                <button onClick={() => setShowOTPInput(false)} className="text-xs text-white/40 hover:text-white">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
