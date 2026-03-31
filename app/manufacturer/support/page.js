"use client";

import RequesterSupportPage from "@/components/support/RequesterSupportPage";

export default function ManufacturerSupportPage() {
  return (
    <RequesterSupportPage
      role="manufacturer"
      basePath="/manufacturer/support"
      heading="Support Tickets"
      subheading="Get help with platform and order issues"
    />
  );
}
