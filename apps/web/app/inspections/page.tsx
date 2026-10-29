import type { Metadata } from "next";
import { Suspense } from "react";
import { RememberBackPath } from "@/components/BackLink";
import { PageGuard } from "@/components/PageGuard";
import { TimelineView } from "./TimelineView";

export const metadata: Metadata = { title: "Inspections" };

export default function TimelinePage() {
  return (
    <PageGuard path="/inspections" signIn={{ title: "Sign in to plan inspections", body: "Landora orders your open homes into a route you can actually make, with travel time between them." }}>
      <TimelineView />
      <Suspense>
        <RememberBackPath />
      </Suspense>
    </PageGuard>
  );
}
