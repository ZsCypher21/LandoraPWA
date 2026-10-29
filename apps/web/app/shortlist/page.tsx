import type { Metadata } from "next";
import { Suspense } from "react";
import { RememberBackPath } from "@/components/BackLink";
import { PageGuard } from "@/components/PageGuard";
import { ShortlistView } from "./ShortlistView";

export const metadata: Metadata = { title: "Saved homes" };

type Props = { searchParams: Promise<{ ids?: string | string[] }> };

export default async function ShortlistPage({ searchParams }: Props) {
  const view = (
    <Suspense fallback={<p className="text-muted">Loading your saved homes…</p>}>
      <ShortlistView />
      <RememberBackPath />
    </Suspense>
  );
  // A shared link (?ids=) is public, so a partner can open it without an account (FR-SHARE-001).
  if ((await searchParams).ids) return view;
  return (
    <PageGuard path="/shortlist" signIn={{ title: "Sign in to see your saved homes", body: "Save homes as you search, then compare them and plan inspections in one place." }}>
      {view}
    </PageGuard>
  );
}
