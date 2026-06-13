// app/auth/manufacturer-google-onboarding/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Logo from "@/components/CrafitLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe, ChevronRight } from "lucide-react";

export default function ManufacturerGoogleOnboarding() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [formData, setFormData] = useState({
    phone: "",
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessType: "",
    businessRegistrationNumber: "",
    businessDescription: "",
    city: "",
    state: "",
    country: "",
  });
  const [capabilities, setCapabilities] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    } else if (status === "authenticated" && session?.user?.role === "manufacturer") {
      if (session?.user?.needsPasswordSetup) {
        router.replace("/auth/setup-password");
      } else {
        // Already a manufacturer, just redirect to dashboard
        router.replace("/manufacturer/dashboard");
      }
    }
  }, [status, session, router]);

  const capabilityOptions = [
    "CNC_Machining", "3D_Printing", "Injection_Molding", "Sheet_Metal", "Casting",
    "Welding", "Assembly", "Finishing", "Prototyping", "Mass_Production",
  ];

  const materialOptions = [
    "Steel", "Aluminum", "Plastic", "Copper", "Brass",
    "Wood", "Carbon_Fiber", "Titanium", "Rubber", "Glass",
  ];

  const toggleCapability = (cap) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  };

  const toggleMaterial = (mat) => {
    setMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register/manufacturer-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone || undefined,
          businessName: formData.businessName,
          businessEmail: formData.businessEmail || session?.user?.email,
          businessPhone: formData.businessPhone || formData.phone || undefined,
          businessType: formData.businessType || undefined,
          businessRegistrationNumber: formData.businessRegistrationNumber || undefined,
          businessDescription: formData.businessDescription || undefined,
          manufacturingCapabilities: capabilities,
          materialsAvailable: materials,
          location: {
            city: formData.city || undefined,
            state: formData.state || undefined,
            country: formData.country || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedSession = await update(); // Update session to reflect new role
        const needsPasswordSetup =
          updatedSession?.user?.needsPasswordSetup ??
          session?.user?.needsPasswordSetup;
        
        // Next step is password setup if required
        if (needsPasswordSetup) {
          router.replace("/auth/setup-password");
        } else {
          router.replace("/manufacturer/dashboard");
        }
      } else {
        setError(data.message || "Onboarding failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-purple-500/30 pb-20 font-sans flex justify-center py-10">
      <div className="w-full max-w-4xl p-8 lg:p-14 bg-[#0c0c11]/90 backdrop-blur-3xl border border-white/5 rounded-[40px] shadow-2xl relative z-10">
        
        <div className="mb-10 text-center">
          <Logo className="h-10 w-10 text-orange-500 mx-auto mb-4" />
          <p className="text-purple-500 font-mono text-[10px] uppercase tracking-[0.3em] mb-2">
            Google Account Linked
          </p>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
            Complete Profile
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Finish setting up your Manufacturer identity.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Business Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-orange-500 border-b border-white/5 pb-2">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-black uppercase tracking-widest">
                Business Details
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-300">
                  Business Name *
                </Label>
                <Input
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-base"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-300">
                  Business Email
                </Label>
                <Input
                  type="email"
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-base"
                  value={formData.businessEmail}
                  onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                  placeholder={session?.user?.email}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-300">
                  Office Phone *
                </Label>
                <Input
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-base"
                  value={formData.businessPhone}
                  onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-300">
                  Business Type *
                </Label>
                <Select onValueChange={(v) => setFormData({ ...formData, businessType: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl text-base text-white">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c0c11] border-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    {[
                      { label: "Sole Proprietorship", value: "sole_proprietorship" },
                      { label: "Partnership", value: "partnership" },
                      { label: "Private Limited (Pvt. Ltd.)", value: "private_limited" },
                      { label: "Public Limited", value: "public_limited" },
                      { label: "NGO / Non-Profit", value: "ngo" },
                      { label: "Other", value: "other" },
                    ].map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-purple-500 border-b border-white/5 pb-2">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-black uppercase tracking-widest">
                Location
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-300">City</Label>
                <Input
                  className="bg-white/5 border-white/10 rounded-xl h-11"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-300">State</Label>
                <Input
                  className="bg-white/5 border-white/10 rounded-xl h-11"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-300">Country</Label>
                <Input
                  className="bg-white/5 border-white/10 rounded-xl h-11"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest border-l-2 border-orange-500 pl-3">
              Manufacturing Capabilities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {capabilityOptions.map((cap) => (
                <label key={cap} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${capabilities.includes(cap) ? "bg-purple-500/10 border-purple-500/50" : "bg-white/[0.02] border-white/5"}`}>
                  <Checkbox
                    className="border-white/20 data-[state=checked]:bg-purple-500"
                    checked={capabilities.includes(cap)}
                    onCheckedChange={() => toggleCapability(cap)}
                  />
                  <span className="text-[11px] font-bold uppercase text-slate-300">
                    {cap.replace(/_/g, " ")}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-purple-500 uppercase tracking-widest border-l-2 border-purple-500 pl-3">
              Available Materials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {materialOptions.map((mat) => (
                <label key={mat} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${materials.includes(mat) ? "bg-orange-500/10 border-orange-500/50" : "bg-white/[0.02] border-white/5"}`}>
                  <Checkbox
                    className="border-white/20 data-[state=checked]:bg-orange-500"
                    checked={materials.includes(mat)}
                    onCheckedChange={() => toggleMaterial(mat)}
                  />
                  <span className="text-[11px] font-bold uppercase text-slate-300">
                    {mat.replace(/_/g, " ")}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 py-3 px-4 rounded-xl text-xs font-bold text-red-400 text-center uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="flex justify-center pt-8">
            <Button
              disabled={loading}
              className="w-full md:w-2/3 h-14 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] group"
            >
              {loading ? "Saving Profile..." : "Complete Setup"}
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
