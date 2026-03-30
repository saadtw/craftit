// app/customer/layout.js
import CustomerShell from "./CustomerShell";

export default function CustomerLayout({ children }) {
  return <CustomerShell>{children}</CustomerShell>;
}
