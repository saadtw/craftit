import ManufacturerSidebar from "@/components/ManufacturerSidebar";
import ManufacturerNavbar from "@/components/ManufacturerNavbar";

export default function ManufacturerLayout({ children }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#050507] text-white">
      <ManufacturerNavbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ManufacturerSidebar />
        <div className="min-h-0 flex-1 min-w-0 overflow-y-auto bg-[#050507]">
          {children}
        </div>
      </div>
    </div>
  );
}
