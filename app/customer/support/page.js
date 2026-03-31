"use client";

import RequesterSupportPage from "@/components/support/RequesterSupportPage";

export default function CustomerSupportPage() {
  return (
    <RequesterSupportPage
      role="customer"
      basePath="/customer/support"
      heading="Support Tickets"
      subheading="Create and track help requests"
    />
  );
}
