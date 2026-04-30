// app/auth/signup/manufacturer/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  ChevronRight,
  UserCircle,
  Building2,
  Globe,
  Lock,
} from "lucide-react";
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
import Image from "next/image";
import leftArrow from "@/assets/backArrow.png";
import identity from "@/assets/Identity.png";
import profile from "@/assets/Profile.png";
import location from "@/assets/location.png";
import production from "@/assets/Production.png";
import security from "@/assets/security.png";

export default function ManufacturerSignup() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sectionCompletion = [
    Boolean(
      formData.name.trim() && formData.email.trim() && formData.phone.trim(),
    ),
    Boolean(
      formData.businessName.trim() &&
      (formData.businessEmail.trim() || formData.email.trim()) &&
      formData.businessPhone.trim() &&
      formData.businessType.trim(),
    ),
    Boolean(
      formData.city.trim() && formData.state.trim() && formData.country.trim(),
    ),
    Boolean(capabilities.length > 0 && materials.length > 0),
    Boolean(
      formData.password.length >= 6 &&
      formData.confirmPassword === formData.password,
    ),
  ];

  const completedSteps = sectionCompletion.filter(Boolean).length;
  const totalSteps = sectionCompletion.length;

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "customer") {
        router.push("/customer");
      } else if (role === "manufacturer") {
        router.push("/manufacturer/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  }, [status, session, router]);

  const capabilityOptions = [
    "CNC_Machining",
    "3D_Printing",
    "Injection_Molding",
    "Sheet_Metal",
    "Casting",
    "Welding",
    "Assembly",
    "Finishing",
    "Prototyping",
    "Mass_Production",
  ];

  const materialOptions = [
    "Steel",
    "Aluminum",
    "Plastic",
    "Copper",
    "Brass",
    "Wood",
    "Carbon_Fiber",
    "Titanium",
    "Rubber",
    "Glass",
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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register/manufacturer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          businessName: formData.businessName,
          businessEmail: formData.businessEmail || formData.email,
          businessPhone: formData.businessPhone || formData.phone || undefined,
          businessType: formData.businessType || undefined,
          businessRegistrationNumber:
            formData.businessRegistrationNumber || undefined,
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
        alert(
          data.message ||
            "Registration successful. Verify your email before login.",
        );
        router.push("/auth/login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-purple-500/30 pb-20 font-sans">
      <nav className="p-8 flex items-center justify-between max-w-7xl mx-auto relative z-20">
        <Link
          href="/auth/signup"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-all group"
        >
          <div className="relative w-4 h-4 group-hover:-translate-x-1 transition-transform">
            <Image
              src={leftArrow}
              alt="back"
              fill
              sizes="16px"
              className="object-contain opacity-70"
            />
          </div>
          Back
        </Link>
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-orange-500" />
          <span className="text-2xl font-black italic tracking-tighter uppercase">
            Craftit
          </span>
        </div>
        <div className="w-24 md:block hidden" />
      </nav>

      <main className="flex justify-center px-4 relative z-10">
        <div className="w-full max-w-5xl bg-[#0c0c11]/90 backdrop-blur-3xl border border-white/5 rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          {/* Brand Sidebar */}
          <div className="lg:w-1/3 p-10 bg-[#08080c] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col relative min-h-full">
            {/* Background Technical Grid */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            ></div>

            <div className="relative z-10 h-full flex flex-col">
              {/* Header Section */}
              <div className="mb-10">
                <p className="text-purple-500 font-mono text-[10px] uppercase tracking-[0.3em] mb-2">
                  Registration_Protocol
                </p>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
                  Manufacturer
                  <br />
                  <span className="text-white/20">Onboarding</span>
                </h1>
              </div>
              {/* THE TIMELINE*/}
              <div className="relative flex flex-col justify-start gap-y-6 my-4 flex-grow">
                {/* The Connecting Line */}
                <div className="absolute left-[11px] top-2 bottom-10 w-[2px] bg-gradient-to-b from-purple-500 via-orange-500/40 to-transparent opacity-30"></div>

                {/* Step 01: Identity & Contact */}
                <div className="relative pl-10">
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-[#0c0c11] border-2 flex items-center justify-center z-10 transition-all ${completedSteps >= 1 ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "border-white/10"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${completedSteps >= 1 ? "bg-purple-500" : "bg-white/10"}`}
                    ></div>
                  </div>
                  <div className="flex flex-col">
                    <h4
                      className={`text-base font-bold uppercase tracking-tight ${completedSteps >= 1 ? "text-white" : "text-slate-500"}`}
                    >
                      Identity & Contact
                    </h4>
                    <p className="text-[13px] text-slate-600 font-bold ">
                      Establish primary administrative access and communication
                      protocols.
                    </p>

                    <div className="mt-4 mb-0 relative w-full max-w-[200px] aspect-square">
                      <Image
                        src={identity}
                        alt="Identity Protocol"
                        placeholder="blur"
                        className="object-contain opacity-80"
                      />
                      {/* This is License for freepik image used */}
                      <a href="http://www.freepik.com" className="sr-only">
                        Designed by vectorjuice / Freepik
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 02 */}
                <div className="relative pl-10">
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-[#0c0c11] border-2 flex items-center justify-center z-10 ${completedSteps >= 2 ? "border-orange-500" : "border-white/10"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${completedSteps >= 2 ? "bg-orange-500" : "bg-white/10"}`}
                    ></div>
                  </div>
                  <div className="flex flex-col">
                    <h4
                      className={`text-base font-bold uppercase tracking-tight ${completedSteps >= 2 ? "text-white" : "text-slate-500"}`}
                    >
                      Business Profile
                    </h4>
                    <p className="text-[13px] text-slate-600 font-bold ">
                      Define entity legal status and core facility parameters.
                    </p>
                    <div className="mt-4 mb-0 relative w-full max-w-[250px] aspect-square">
                      <Image
                        src={profile}
                        alt="Business Profile"
                        placeholder="blur"
                        className="object-contain opacity-80"
                      />
                      {/* This is License for freepik image used */}
                      <a href="http://www.freepik.com" className="sr-only">
                        Designed by vectorjuice / Freepik
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 3: Location */}
                <div className="relative pl-10 group">
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-[#0c0c11] border-2 flex items-center justify-center z-10 transition-all duration-700 ${completedSteps >= 3 ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-110" : "border-white/10"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors duration-500 ${completedSteps >= 3 ? "bg-purple-500" : "bg-white/10"}`}
                    ></div>
                  </div>
                  <div className="flex flex-col">
                    <h4
                      className={`text-base font-bold uppercase tracking-tight transition-colors ${completedSteps >= 3 ? "text-white" : "text-slate-500"}`}
                    >
                      Location
                    </h4>
                    <p className="text-[13px] text-slate-600 font-bold ">
                      Synchronize manufacturing locale with global logistics
                      network.
                    </p>
                    <p className="text-[11px] text-slate-600 uppercase font-bold tracking-tighter mt-1">
                      Regional Deployment
                    </p>
                    <div className="mt-4 mb-0 relative w-full max-w-[250px] aspect-square">
                      <Image
                        src={location}
                        alt="Location"
                        placeholder="blur"
                        className="object-contain opacity-80"
                      />
                      {/* This is License for freepik image used */}
                      <a href="http://www.freepik.com" className="sr-only">
                        Designed by vectorjuice / Freepik
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 4: Production */}
                <div className="relative pl-10 group">
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-[#0c0c11] border-2 flex items-center justify-center z-10 transition-all duration-700 ${completedSteps >= 4 ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-110" : "border-white/10"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors duration-500 ${completedSteps >= 4 ? "bg-orange-500" : "bg-white/10"}`}
                    ></div>
                  </div>
                  <div className="flex flex-col">
                    <h4
                      className={`text-base font-bold uppercase tracking-tight transition-colors ${completedSteps >= 4 ? "text-white" : "text-slate-500"}`}
                    >
                      Production Matrix
                    </h4>
                    <p className="text-[13px] text-slate-600 font-bold ">
                      Calibrate machinery, material availability, and output
                      capacity.
                    </p>
                    <div className="mt-4 mb-0 relative w-full max-w-[200px] aspect-square">
                      <Image
                        src={production}
                        alt="Production Matrix"
                        placeholder="blur"
                        className="object-contain opacity-80"
                      />
                      {/* This is License for freepik image used */}
                      <a href="http://www.freepik.com" className="sr-only">
                        Designed by vectorjuice / Freepik
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 5: Security */}
                <div className="relative pl-10 group">
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-[#0c0c11] border-2 flex items-center justify-center z-10 transition-all duration-700 ${completedSteps >= 5 ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-110" : "border-white/10"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors duration-500 ${completedSteps >= 5 ? "bg-purple-500" : "bg-white/10"}`}
                    ></div>
                  </div>
                  <div className="flex flex-col">
                    <h4
                      className={`text-base font-bold uppercase tracking-tight transition-colors ${completedSteps >= 5 ? "text-white" : "text-slate-500"}`}
                    >
                      Security Layer
                    </h4>
                    <p className="text-[13px] text-slate-600 font-bold ">
                      Finalize encrypted credentials and secure the manufacturer
                      portal.
                    </p>
                  </div>
                  <div className="mt-4 mb-0 relative w-full max-w-[200px] aspect-square">
                    <Image
                      src={security}
                      alt="Security Layer"
                      placeholder="blur"
                      className="object-contain opacity-80"
                    />
                    {/* This is License for freepik image used */}
                    <a href="http://www.freepik.com" className="sr-only">
                      Designed by vectorjuice / Freepik
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-white/5 mt-auto pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                      Form Completion
                    </span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-4 rounded-full transition-all duration-1000 ${completedSteps >= i ? "bg-purple-500 shadow-[0_0_10px_#a855f7]" : "bg-white/5"}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase">
                      Completed
                    </span>
                    <span className="text-sm font-black italic text-purple-400">
                      {Math.round((completedSteps / 5) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="flex-1 p-8 lg:p-14">
            <form onSubmit={handleSubmit} className="space-y-12">
              {/* 1. Personal Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-purple-500 border-b border-white/5 pb-2">
                  <UserCircle className="w-4 h-4" />
                  <span className="text-sm font-black uppercase tracking-widest">
                    Personal Information
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      CEO / Contact Name *
                    </Label>
                    <Input
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-base focus:border-purple-500"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      Email *
                    </Label>
                    <Input
                      type="email"
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-base"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      Personal Mobile *
                    </Label>
                    <Input
                      type="tel"
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-base"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Business Details */}
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessName: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessEmail: e.target.value,
                        })
                      }
                      placeholder="Defaults to personal email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      Office Phone *
                    </Label>
                    <Input
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-base"
                      value={formData.businessPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessPhone: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      Business Type *
                    </Label>
                    <Select
                      onValueChange={(v) =>
                        setFormData({ ...formData, businessType: v })
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl text-base text-white hover:bg-white/10 transition-colors focus:ring-purple-500/50">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>

                      <SelectContent className="bg-[#0c0c11] border-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        {[
                          "Sole Proprietorship",
                          "Partnership",
                          "Private Limited (Pvt. Ltd.)",
                          "Public Limited",
                          "NGO / Non-Profit",
                          "Other",
                        ].map((type) => (
                          <SelectItem
                            key={type}
                            value={type.toLowerCase()}
                            className="!focus:bg-purple-500/20 !focus:text-purple-300 cursor-pointer rounded-lg m-1 transition-colors font-medium"
                          >
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-bold text-slate-300">
                      Registration Number
                    </Label>
                    <Input
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-base"
                      value={formData.businessRegistrationNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessRegistrationNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-bold text-slate-300">
                      Description
                    </Label>
                    <Textarea
                      className="bg-white/5 border-white/10 rounded-xl min-h-[100px] text-base"
                      value={formData.businessDescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessDescription: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* 3. Location */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-purple-500 border-b border-white/5 pb-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-black uppercase tracking-widest">
                    Location
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      City
                    </Label>
                    <Input
                      className="bg-white/5 border-white/10 rounded-xl h-11"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      State
                    </Label>
                    <Input
                      className="bg-white/5 border-white/10 rounded-xl h-11"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-300">
                      Country
                    </Label>
                    <Input
                      className="bg-white/5 border-white/10 rounded-xl h-11"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 4. Capabilities (Stacked Section) */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest border-l-2 border-orange-500 pl-3">
                  Manufacturing Capabilities
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {capabilityOptions.map((cap) => (
                    <label
                      key={cap}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${capabilities.includes(cap) ? "bg-purple-500/10 border-purple-500/50" : "bg-white/[0.02] border-white/5"}`}
                    >
                      <Checkbox
                        className="border-white/20 data-[state=checked]:bg-purple-500"
                        checked={capabilities.includes(cap)}
                        onCheckedChange={() => toggleCapability(cap)}
                      />
                      <span className="text-[11px] font-bold uppercase text-slate-300">
                        {cap}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 5. Materials (Stacked Section) */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-purple-500 uppercase tracking-widest border-l-2 border-purple-500 pl-3">
                  Available Materials
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {materialOptions.map((mat) => (
                    <label
                      key={mat}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${materials.includes(mat) ? "bg-orange-500/10 border-orange-500/50" : "bg-white/[0.02] border-white/5"}`}
                    >
                      <Checkbox
                        className="border-white/20 data-[state=checked]:bg-orange-500"
                        checked={materials.includes(mat)}
                        onCheckedChange={() => toggleMaterial(mat)}
                      />
                      <span className="text-[11px] font-bold uppercase text-slate-300">
                        {mat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 6. Security & Legal */}
              <div className="flex items-center gap-2 text-orange-500 border-b border-white/5 pb-2">
                <span className="text-sm font-black uppercase tracking-widest border-l-2 border-orange-500 pl-3">
                  Set Password
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <Label className="text-sm font-bold text-slate-400">
                    Password *
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="bg-white/5 border-white/10 h-11 text-base rounded-xl pr-12"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 bottom-3 text-[10px] text-purple-500 font-bold uppercase"
                  >
                    Show
                  </button>
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-sm font-bold text-slate-400">
                    Confirm Password *
                  </Label>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    className="bg-white/5 border-white/10 h-11 text-base rounded-xl pr-12"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 bottom-3 text-[10px] text-purple-500 font-bold uppercase"
                  >
                    Show
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="terms"
                  required
                  className="border-white/20 data-[state=checked]:bg-purple-500"
                />
                <Label
                  htmlFor="terms"
                  className="text-xs font-bold text-slate-400 uppercase tracking-tight cursor-pointer"
                >
                  Agree to{" "}
                  <span className="text-purple-500">Terms & Conditions</span>{" "}
                  and <span className="text-purple-500">Privacy Policy</span>
                </Label>
              </div>

              <div className="flex justify-center">
                <Button
                  disabled={loading}
                  className="w-full md:w-2/3 h-14 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] group"
                >
                  {loading ? "Registering..." : "Create Manufacturer Account"}
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <p className="text-center text-xs text-slate-500 font-bold uppercase tracking-widest mt-6">
                Already a partner?{" "}
                <Link
                  href="/auth/login"
                  className="text-orange-500 hover:text-orange-400 ml-2 transition-colors"
                >
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
