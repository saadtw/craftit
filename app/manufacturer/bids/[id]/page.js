import { redirect } from "next/navigation";

export default async function ManufacturerBidDetailRedirect({ params }) {
  const { id } = await params;

  redirect(`/bids/${id}`);
}
