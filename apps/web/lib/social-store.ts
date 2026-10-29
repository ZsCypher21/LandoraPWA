import "server-only";
import { randomUUID } from "node:crypto";
import { AS_OF, agents, evaluatedListings, publishedListings, suburbs, type RawListing } from "./data";
import { day, time } from "./format";
import { PERSONAS } from "./personas";
import { createSocialStore, followsOf, publicQuestions, visiblePosts, type HubPost, type Question, type Report, type SocialStore } from "./social";
import type { ListingDetail } from "./types";

// PROTOTYPE ONLY (ADR 0012). Sample social content seeded from the synthetic dataset, held in server
// memory like mock-store.ts: shared by everyone on this server and reset on restart. Every post, question
// and creator here is fictional. The build semester replaces this with MVP-2 tables.

const KEY = Symbol.for("landora.prototype.socialStore");
const SEED_DAY = `${AS_OF}T09:00:00+10:00`;

function at(daysBefore: number, hour = 9): string {
  const d = new Date(SEED_DAY);
  d.setUTCDate(d.getUTCDate() - daysBefore);
  d.setUTCHours(d.getUTCHours() + (hour - 9));
  return d.toISOString();
}

/** The published raw listings with their agent scope, for agent answers and seeding. */
export function publishedScopes(): RawListing[] {
  const live = new Set(publishedListings().map((l) => l.id));
  return evaluatedListings()
    .map(({ raw }) => raw)
    .filter((r) => live.has(r.id));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

export interface SuburbSnapshot {
  forSale: number;
  forRent: number;
  openHomes: number;
  medianAskingAud: number | null;
  pricedCount: number;
}

/** Counts from the synthetic listings. Labelled as such wherever shown (SOC-M2). */
export function suburbSnapshot(suburbId: string): SuburbSnapshot {
  const ls = publishedListings().filter((l) => l.suburbId === suburbId);
  const priced = ls.filter((l) => l.listingType !== "rent" && l.priceAud !== null).map((l) => l.priceAud!);
  return {
    forSale: ls.filter((l) => l.listingType !== "rent").length,
    forRent: ls.filter((l) => l.listingType === "rent").length,
    openHomes: ls.reduce((n, l) => n + l.inspections.length, 0),
    medianAskingAud: median(priced),
    pricedCount: priced.length,
  };
}

const CREATORS = [
  { name: "Jordan Sample", handle: "Coast Walks (fictional)", title: (s: string) => `Three walks every ${s} buyer should do before an open home`, body: (s: string) => `Before you inspect in ${s}, walk the streets at school pick-up and again after dark. Note the traffic, the noise and where the afternoon sun lands. It tells you more than any brochure.` },
  { name: "Alex Placeholder", handle: "First Home Diaries (fictional)", title: (s: string) => `What I wish I'd asked at my first ${s} inspection`, body: () => "Ask when the roof and hot water system were last replaced, what the body corporate levies cover, and whether there are any approved plans next door. Then check the answers in the contract, not just the conversation." },
];

function seedPosts(): HubPost[] {
  const posts: HubPost[] = [];
  suburbs().forEach((s, i) => {
    const snap = suburbSnapshot(s.id);
    const price = snap.medianAskingAud ? `The median displayed asking price is ${snap.medianAskingAud.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })} across ${snap.pricedCount} homes that show a price.` : "Too few homes show a price to give a median.";
    posts.push({
      id: `post-wrap-${s.id}`,
      suburbId: s.id,
      kind: "market_wrap",
      title: `${s.name} this week: ${snap.forSale} homes for sale, ${snap.openHomes} open homes`,
      body: `${price} ${snap.forRent} homes are for rent. Most open homes are this Saturday, so plan your route early.`,
      authorName: "Landora market desk",
      authorKind: "landora_editorial",
      source: `Counted from synthetic listings as of ${AS_OF}. Written and approved by Landora staff.`,
      publishedAt: at(1, 7),
      approvedOn: AS_OF,
      removed: false,
    });
    const top = publishedListings()
      .filter((l) => l.suburbId === s.id && l.listingType !== "rent")
      .slice(0, 3)
      .map((l) => l.displayAddress.split(",")[0]);
    if (top.length > 0) {
      posts.push({
        id: `post-trend-${s.id}`,
        suburbId: s.id,
        kind: "trending",
        title: `Most saved in ${s.name}`,
        body: `${top.join(", ")}.`,
        authorName: "Landora trending",
        authorKind: "landora_data",
        source: "Fixed sample for the preview. Trending v1 (FR-TRND-001) will count saves and shares, with per-person caps and abuse filtering.",
        publishedAt: at(2, 12),
        approvedOn: AS_OF,
        removed: false,
      });
    }
    if (i % 2 === 0) {
      const c = CREATORS[(i / 2) % CREATORS.length]!;
      posts.push({
        id: `post-creator-${s.id}`,
        suburbId: s.id,
        kind: "creator",
        title: c.title(s.name),
        body: c.body(s.name),
        authorName: `${c.name} · ${c.handle}`,
        authorKind: "founding_creator",
        source: "Founding creator post, reviewed and approved by Landora moderation. Opinion, not verified property fact.",
        publishedAt: at(4 + (i % 3), 18),
        approvedOn: AS_OF,
        removed: false,
      });
    }
  });
  return posts;
}

const OTHER_BUYERS = ["persona-buyer-2", "persona-buyer-3", "persona-buyer-4"];

function seedQuestions(): { questions: Question[]; reports: Report[] } {
  const scopes = publishedScopes();
  const casey = PERSONAS.agent.agentId!;
  const caseys = scopes.filter((r) => r.agentIds.includes(casey));
  const others = scopes.filter((r) => !r.agentIds.includes(casey) && r.listingType !== "rent");
  const name = (r: RawListing) => agents().find((a) => a.id === r.agentIds[0])?.fullName ?? "The agent";
  const questions: Question[] = [];
  const reports: Report[] = [];
  const q = (r: RawListing | undefined, asker: string, text: string, status: Question["status"], daysBefore: number, answer?: string) => {
    if (!r) return null;
    const item: Question = {
      id: randomUUID(),
      listingId: r.id,
      askerUserId: asker,
      text,
      status,
      askedAt: at(daysBefore, 10),
      answer: answer ? { agentId: r.agentIds[0]!, agentName: name(r), text: answer, answeredAt: at(daysBefore - 1, 15), hidden: false } : null,
    };
    questions.push(item);
    return item;
  };
  q(caseys[0], OTHER_BUYERS[0]!, "Is the back yard fully fenced? We have a dog.", "published", 5, "Yes, it's fully fenced with a lockable side gate. The fence on the eastern side was replaced last year.");
  q(caseys[1], OTHER_BUYERS[1]!, "Are pets allowed under the body corporate by-laws?", "published", 2);
  q(caseys[2], PERSONAS.buyer.userId, "Has the roof been replaced, and is there a recent building report?", "pending", 0);
  q(others[0], OTHER_BUYERS[2]!, "How long is the walk to the nearest bus stop?", "published", 6, "About six minutes to the stop on the main road, with buses every 20 minutes on weekdays.");
  const reported = q(caseys[3] ?? others[1], OTHER_BUYERS[0]!, "Don't bother with this one, the agent never calls back and the price is a joke.", "hidden", 1);
  if (reported) {
    reports.push({ id: randomUUID(), target: "question", targetId: reported.id, reason: "offensive", reporterUserId: OTHER_BUYERS[2]!, reportedAt: at(0, 8), status: "open" });
  }
  return { questions, reports };
}

function seedStore(): SocialStore {
  const store = createSocialStore({ posts: seedPosts(), ...seedQuestions() });
  // The sample buyer starts with a few follows so the feed has something to show. Real accounts start empty (SOC-C1).
  const byName = new Map(suburbs().map((s) => [s.name, s.id]));
  const buyer = PERSONAS.buyer.userId;
  const casey = PERSONAS.agent.agentId!;
  const firstCasey = publishedScopes().find((r) => r.agentIds.includes(casey));
  const seeded = [
    { kind: "suburb" as const, targetId: byName.get("Mooloolaba") },
    { kind: "suburb" as const, targetId: byName.get("Buderim") },
    { kind: "listing" as const, targetId: firstCasey?.id },
    { kind: "agent" as const, targetId: casey },
  ];
  store.follows.set(
    buyer,
    seeded.flatMap((f) => (f.targetId ? [{ kind: f.kind, targetId: f.targetId, since: at(7) }] : [])),
  );
  return store;
}

/** One store per server process; survives dev-server module reloads. */
export function socialStore(): SocialStore {
  const holder = globalThis as typeof globalThis & { [KEY]?: SocialStore };
  holder[KEY] ??= seedStore();
  return holder[KEY];
}

// --- Activity feed (FR-SOC-001) -------------------------------------------------------------

export interface FeedItem {
  id: string;
  kind: "post" | "inspection" | "answer" | "listing";
  title: string;
  body: string;
  href: string;
  at: string;
  /** Who it's from and why it's in your feed. */
  context: string;
}

export function feedFor(userId: string): FeedItem[] {
  const store = socialStore();
  const follows = followsOf(store, userId);
  const listings = new Map(publishedListings().map((l) => [l.id, l]));
  const suburbNames = new Map(suburbs().map((s) => [s.id, s.name]));
  const items: FeedItem[] = [];

  for (const f of follows) {
    if (f.kind === "suburb") {
      for (const p of visiblePosts(store, f.targetId).slice(0, 2)) {
        items.push({ id: `${p.id}`, kind: "post", title: p.title, body: p.body, href: `/hub/${p.suburbId}#${p.id}`, at: p.publishedAt, context: `${suburbNames.get(p.suburbId) ?? "Suburb"} hub` });
      }
    }
    if (f.kind === "listing") {
      const l = listings.get(f.targetId);
      if (!l) continue;
      const next = l.inspections[0];
      if (next) {
        items.push({ id: `insp-${l.id}`, kind: "inspection", title: `Open home ${day(next.startsAt)}, ${time(next.startsAt)}`, body: l.displayAddress, href: `/listing/${l.id}`, at: SEED_DAY, context: "A home you follow" });
      }
      for (const q of publicQuestions(store, l.id).filter((x) => x.answer)) {
        items.push({ id: `ans-${q.id}`, kind: "answer", title: `The agent answered: “${q.text}”`, body: q.answer!.text, href: `/listing/${l.id}#questions`, at: q.answer!.answeredAt, context: "A home you follow" });
      }
    }
    if (f.kind === "agent") {
      const agentName = agents().find((a) => a.id === f.targetId)?.fullName ?? "An agent you follow";
      const latest = publishedScopes()
        .filter((r) => r.agentIds.includes(f.targetId))
        .sort((a, b) => b.sourceModTime.localeCompare(a.sourceModTime))[0];
      const l: ListingDetail | undefined = latest ? listings.get(latest.id) : undefined;
      if (l) items.push({ id: `new-${l.id}`, kind: "listing", title: `Updated listing: ${l.headline}`, body: l.displayAddress, href: `/listing/${l.id}`, at: new Date(l.sourceModTime).toISOString(), context: agentName });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
