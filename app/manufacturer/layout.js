import ManufacturerSidebar from "@/components/ManufacturerSidebar";
import ManufacturerNavbar from "@/components/ManufacturerNavbar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ManufacturerLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.needsPasswordSetup) {
    redirect("/auth/setup-password");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#050507] text-white">
      <ManufacturerNavbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ManufacturerSidebar />
        <div className="min-h-0 flex-1 min-w-0 overflow-y-auto bg-[#050507] scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
}
