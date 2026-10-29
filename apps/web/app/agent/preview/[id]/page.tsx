import type { Metadata } from "next";
import Link from "next/link";
import { Pill, PUBLICATION } from "@/components/console/Pill";
import { ListingView } from "@/components/ListingView";
import { PageGuard } from "@/components/PageGuard";
import { agentConsoleData, verificationOf } from "@/lib/console";
import { listingPreview } from "@/lib/data";
import { currentViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Preview listing" };

type Props = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: Props) {
  const { id } = await params;
  return (
    <PageGuard path="/agent/preview" signIn={{ title: "Sign in to preview listings", body: "Agents preview listings exactly as buyers will see them." }}>
      <Preview id={id} />
    </PageGuard>
  );
}

async function Preview({ id }: { id: string }) {
  const viewer = await currentViewer();
  // Only listings this agent or agency admin manages can be previewed (FR-ACC-002 scope).
  const managed = agentConsoleData(viewer)?.listings.find((l) => l.id === id);
  const listing = managed ? listingPreview(id, verificationOf) : null;
  if (!managed || !listing) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold">Listing not found</h1>
        <p className="mt-2 text-muted">It isn't one of the listings you manage, or it has left your feed.</p>
        <Link href="/agent" className="btn btn-primary mt-4">
          Back to console
        </Link>
      </div>
    );
  }
  const pill = PUBLICATION[managed.status]!;
  return (
    <ListingView
      listing={listing}
      preview={
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-brand-600 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Preview: this is exactly what buyers see</p>
            <p className="text-sm text-muted">
              {managed.status === "published" ? "This listing is live." : managed.status === "unpublished" ? "Buyers can't see it until you publish." : "Buyers can't see it until the blocking checks pass."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Pill tone={pill.tone}>{pill.label}</Pill>
            <Link href="/agent#listings" className="btn btn-secondary">
              Back to console
            </Link>
          </div>
        </div>
      }
    />
  );
}
