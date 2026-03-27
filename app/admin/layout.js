import AdminSidebar from "@/components/AdminSidebar";

export const metadata = {
  title: "Craftit Admin",
};

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
