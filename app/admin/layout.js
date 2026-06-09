// app/admin/layout.js
import AdminSidebar from "@/components/AdminSidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Craftit Admin",
};

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.needsPasswordSetup) {
    redirect("/auth/setup-password");
  }

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-950">
      <AdminSidebar />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
