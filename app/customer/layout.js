// app/customer/layout.js
import CustomerShell from "./CustomerShell";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CustomerLayout({ children }) {
  const session = await getServerSession(authOptions);

  // Enforce password setup for Google OAuth users before they can use the app
  if (session?.user?.needsPasswordSetup) {
    redirect("/auth/setup-password");
  }

  return <CustomerShell>{children}</CustomerShell>;
}
