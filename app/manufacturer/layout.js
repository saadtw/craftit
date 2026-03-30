// app/manufacturer/layout.js
import ManufacturerNav from "@/components/Manufacturernav";

export default function ManufacturerLayout({ children }) {
  return (
    <>
      <ManufacturerNav />
      {children}
    </>
  );
}
