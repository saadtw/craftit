"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
        Manufacturing Marketplace
      </h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "40px", color: "#666" }}>
        Welcome to the B2B Manufacturing Platform
      </p>
      <p style={{ marginBottom: "40px" }}>
        Connect with manufacturers for custom hardware solutions. Upload 3D
        designs, get quotes, and manage your orders all in one place.
      </p>

      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link href="/auth/login">
          <button
            style={{
              padding: "15px 40px",
              fontSize: "18px",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Login
          </button>
        </Link>

        <Link href="/auth/signup">
          <button
            style={{
              padding: "15px 40px",
              fontSize: "18px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Sign Up
          </button>
        </Link>
      </div>

      {/* Feature highlights */}
      <div
        style={{
          marginTop: "60px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "30px",
          textAlign: "left",
        }}
      >
        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h3>🎯 Smart Matching</h3>
          <p>
            Get matched with manufacturers based on your requirements,
            materials, and budget.
          </p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h3>🖼️ 3D Visualization</h3>
          <p>
            Upload and preview 3D models to communicate your design clearly.
          </p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h3>💼 Verified Network</h3>
          <p>
            Work with verified manufacturers and read reviews from other
            customers.
          </p>
        </div>
      </div>
    </div>
  );
}
