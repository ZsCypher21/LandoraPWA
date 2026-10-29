import type { Metadata } from "next";
import { PageGuard } from "@/components/PageGuard";
import { suburbs } from "@/lib/data";
import { currentViewer } from "@/lib/session";
import { followsOf, profileOf, publicView } from "@/lib/social";
import { socialStore } from "@/lib/social-store";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Your profile (preview)" };

export default function ProfilePage() {
  return (
    <PageGuard path="/hub/profile" signIn={{ title: "Sign in to see your profile", body: "Your profile is private unless you choose to share it." }}>
      <Profile />
    </PageGuard>
  );
}

const NEVER_SHOWN = ["Saved homes and collections", "Inspection plans, notes and ratings", "First home check answers", "Your email address and phone", "Homes and agents you follow", "Questions you ask (they always show as “A buyer”)"];

async function Profile() {
  const viewer = await currentViewer();
  const store = socialStore();
  const { userId, name } = viewer.persona!;
  const profile = profileOf(store, userId, name);
  const view = publicView(profile, followsOf(store, userId));
  const names = new Map(suburbs().map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="eyebrow">Your profile</p>
        <h1 className="mt-1 text-3xl font-extrabold">{name}</h1>
        <p className="mt-2 text-muted">Your profile is for the community hub. It's private unless you change it, and you can change it back any time.</p>
      </header>

      <ProfileForm visibility={profile.visibility} showFollowedSuburbs={profile.showFollowedSuburbs} />

      <section aria-labelledby="others-title" className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 id="others-title" className="text-lg font-bold">
            What others see
          </h2>
          {view.visible ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-display text-lg font-bold text-brand-800" aria-hidden="true">
                {view.displayName!.charAt(0)}
              </span>
              <div>
                <p className="font-semibold">{view.displayName}</p>
                <p className="text-sm text-muted">{view.followedSuburbIds.length ? `Follows ${view.followedSuburbIds.map((id) => names.get(id)).join(", ")}` : "Landora member"}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-canvas p-4 text-sm text-muted">Nothing. Your profile is private.</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold">Never shown to anyone</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {NEVER_SHOWN.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="text-brand-700" aria-hidden="true">
                  ✓
                </span>
                {n}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Agents see your details only if you choose to contact them (FR-AGT-004).</p>
        </div>
      </section>
    </div>
  );
}
