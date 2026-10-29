import Link from "next/link";
import { AskForm } from "@/app/hub/QuestionForms";
import { can } from "@/lib/roles";
import { currentViewer } from "@/lib/session";
import { isFollowing, publicQuestions } from "@/lib/social";
import { publishedScopes, socialStore } from "@/lib/social-store";
import type { ListingDetail } from "@/lib/types";
import { SignInPrompt } from "../SignInPrompt";
import { FollowButton } from "./FollowButton";
import { QuestionItem } from "./QuestionItem";

/** Listing Q&A and follow (FR-QA-001, FR-SOC-001), part of the social preview (ADR 0012). */
export async function ListingSocial({ listing }: { listing: ListingDetail }) {
  const viewer = await currentViewer();
  const store = socialStore();
  const questions = publicQuestions(store, listing.id);
  const following = can(viewer.role, "social.follow") && isFollowing(store, viewer.persona?.userId ?? "", "listing", listing.id);
  const agentId = publishedScopes().find((r) => r.id === listing.id)?.agentIds[0];

  return (
    <section id="questions" aria-labelledby="qa-heading" className="card scroll-mt-24 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="qa-heading" className="text-lg font-bold">
              Questions for the agent
            </h2>
            <span className="rounded-full bg-sun-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">Preview</span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Answered by the listing agent{agentId && (
              <>
                {" "}
                (<Link href={`/hub/pro/${agentId}`} className="font-medium text-brand-700 hover:underline">see their profile</Link>)
              </>
            )}
            . Questions are checked by a moderator first. Sample content.
          </p>
        </div>
        <FollowButton kind="listing" targetId={listing.id} label={listing.displayAddress} following={following} suburbId={listing.suburbId} />
      </div>

      {questions.length === 0 ? (
        <p className="mt-4 rounded-xl bg-canvas p-4 text-sm text-muted">No questions yet. Be the first to ask.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {questions.map((q) => (
            <QuestionItem key={q.id} q={q} />
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {can(viewer.role, "qa.ask") ? (
          <AskForm listingId={listing.id} />
        ) : viewer.role === "guest" ? (
          <SignInPrompt compact title="Sign in to ask the agent" body="Your question shows as “A buyer”. Your name and contact details stay private." />
        ) : (
          <p className="text-sm text-muted">Only buyers can ask questions. Agents answer from Hub → Questions to answer.</p>
        )}
      </div>
    </section>
  );
}
