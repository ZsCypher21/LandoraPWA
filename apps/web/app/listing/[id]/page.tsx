import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/ListingView";
import { ListingSocial } from "@/components/social/ListingSocial";
import { listingById } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = listingById((await params).id);
  return { title: l ? l.displayAddress : "Listing not found" };
}

export default async function ListingPage({ params }: Props) {
  const l = listingById((await params).id);
  if (!l) notFound();
  return (
    <div className="flex flex-col gap-6">
      <ListingView listing={l} />
      <ListingSocial listing={l} />
    </div>
  );
}
