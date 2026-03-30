// app/admin/layout.js
import AdminSidebar from "@/components/AdminSidebar";

export const metadata = {
  title: "Craftit Admin",
};

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
