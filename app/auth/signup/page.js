"use client";

import Link from "next/link";

export default function SignupPage() {
  return (
    <div>
      <h1>Sign Up</h1>
      <p>Select your account type:</p>
      <Link href="/auth/signup/customer">
        <button>Sign Up as Customer</button>
      </Link>
      <Link href="/auth/signup/manufacturer">
        <button>Sign Up as Manufacturer</button>
      </Link>
      <Link href="/">
        <button>Back to Home</button>
      </Link>
    </div>
  );
}
