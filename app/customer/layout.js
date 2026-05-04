// app/customer/layout.js
import CustomerShell from "./CustomerShell";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CustomerLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.requiresPasswordSetup) {
    redirect("/auth/set-password");
  }

  return <CustomerShell>{children}</CustomerShell>;
}
