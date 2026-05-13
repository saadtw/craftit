// app/customer/layout.js
import CustomerShell from "./CustomerShell";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CustomerLayout({ children }) {
  const session = await getServerSession(authOptions);

  return <CustomerShell>{children}</CustomerShell>;
}
