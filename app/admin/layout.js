// app/admin/layout.js
import AdminSidebar from "@/components/AdminSidebar";

export const metadata = {
  title: "Craftit Admin",
};

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-950">
      <AdminSidebar />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
