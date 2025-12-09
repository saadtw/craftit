"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManufacturerSignup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    businessName: "",
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
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const toggleMaterial = (mat) => {
    setMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
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
        alert("Registration successful! Your account is pending verification.");
        router.push("/auth/pending-verification");
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
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Manufacturer Sign Up</h1>
      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <h2>Personal Information</h2>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Contact Person Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Confirm Password *
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        {/* Business Information */}
        <h2>Business Information</h2>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Business Name *
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) =>
              setFormData({ ...formData, businessName: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Business Registration Number
          </label>
          <input
            type="text"
            value={formData.businessRegistrationNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                businessRegistrationNumber: e.target.value,
              })
            }
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        {/* Manufacturing Capabilities */}
        <h2>Manufacturing Capabilities</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          {capabilityOptions.map((cap) => (
            <label key={cap} style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={capabilities.includes(cap)}
                onChange={() => toggleCapability(cap)}
                style={{ marginRight: "8px" }}
              />
              {cap.replace(/_/g, " ")}
            </label>
          ))}
        </div>

        {/* Available Materials */}
        <h2>Available Materials</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          {materialOptions.map((mat) => (
            <label key={mat} style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={materials.includes(mat)}
                onChange={() => toggleMaterial(mat)}
                style={{ marginRight: "8px" }}
              />
              {mat.replace(/_/g, " ")}
            </label>
          ))}
        </div>

        {error && <p style={{ color: "red", marginBottom: "15px" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "16px",
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "10px",
          }}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <Link href="/auth/signup">
        <button style={{ width: "100%", padding: "10px", fontSize: "16px" }}>
          Back
        </button>
      </Link>
    </div>
  );
}
