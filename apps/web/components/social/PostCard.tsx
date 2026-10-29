import { stamp } from "@/lib/format";
import { AUTHOR_LABELS, type HubPost } from "@/lib/social";
import { ReportButton } from "./ReportButton";
import { SampleTag } from "./PreviewBanner";

const KIND: Record<HubPost["kind"], { label: string; className: string }> = {
  market_wrap: { label: "Market wrap", className: "bg-brand-50 text-brand-800" },
  trending: { label: "Trending", className: "bg-sun-50 text-sun-800" },
  creator: { label: "Local tips", className: "bg-canvas text-ink" },
};

/** A seeded hub post. Author type and source on every card (SOC-M2); no comments in v1 (FR-HUB-001). */
export function PostCard({ post, suburbName }: { post: HubPost; suburbName?: string | undefined }) {
  const kind = KIND[post.kind];
  return (
    <article id={post.id} className="card flex scroll-mt-24 flex-col gap-2 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kind.className}`}>{kind.label}</span>
        {suburbName && <span className="text-xs font-medium text-muted">{suburbName}</span>}
        <SampleTag />
      </div>
      <h3 className="text-lg font-bold leading-snug">{post.title}</h3>
      <p className="text-sm">{post.body}</p>
      <footer className="mt-1 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-2">
        <div className="text-xs text-muted">
          <p>
            <span className="font-semibold text-ink">{post.authorName}</span> · {AUTHOR_LABELS[post.authorKind]} · {stamp(post.publishedAt)}
          </p>
          <p className="mt-0.5">Source: {post.source}</p>
        </div>
        <ReportButton target="post" targetId={post.id} />
      </footer>
    </article>
  );
}
