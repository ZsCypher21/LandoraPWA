// Social preview (ADR 0012): profiles, follows, Suburb Hub v1 posts, listing Q&A, reports and
// moderation. Pure and framework-free so the rules in docs/privacy/social-trust-rules.md (SOC-*)
// are unit-tested. Server state lives in social-store.ts; the build semester swaps that for tables.

export type FollowKind = "suburb" | "listing" | "agent";

export interface Follow {
  kind: FollowKind;
  targetId: string;
  since: string;
}

/**
 * Who may author a hub post (SOC-M1, SOC-A1). There is deliberately no AI or concierge author:
 * the concierge never posts as anyone.
 */
export const AUTHOR_KINDS = ["landora_editorial", "landora_data", "founding_creator"] as const;
export type AuthorKind = (typeof AUTHOR_KINDS)[number];

export const AUTHOR_LABELS: Record<AuthorKind, string> = {
  landora_editorial: "Landora editorial",
  landora_data: "Landora data",
  founding_creator: "Founding creator",
};

export interface HubPost {
  id: string;
  suburbId: string;
  kind: "market_wrap" | "trending" | "creator";
  title: string;
  body: string;
  authorName: string;
  authorKind: AuthorKind;
  /** Where the content or numbers come from (SOC-M2). */
  source: string;
  publishedAt: string;
  /** Seeded content is approved before it appears (FR-HUB-001). */
  approvedOn: string;
  removed: boolean;
}

export type QuestionStatus = "pending" | "published" | "rejected" | "hidden" | "removed";

export interface Answer {
  agentId: string;
  agentName: string;
  text: string;
  answeredAt: string;
  hidden: boolean;
}

export interface Question {
  id: string;
  listingId: string;
  askerUserId: string;
  text: string;
  status: QuestionStatus;
  askedAt: string;
  answer: Answer | null;
}

export const REPORT_REASONS = {
  inaccurate: "Inaccurate or misleading",
  personal_info: "Shares personal information",
  offensive: "Offensive or abusive",
  spam: "Spam or advertising",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && Object.hasOwn(REPORT_REASONS, value);
}

export type ReportTarget = "question" | "answer" | "post";

export interface Report {
  id: string;
  target: ReportTarget;
  /** Question id for questions and answers; post id for posts. */
  targetId: string;
  reason: ReportReason;
  reporterUserId: string;
  reportedAt: string;
  status: "open" | "upheld" | "dismissed";
}

export type Visibility = "private" | "public";

export interface Profile {
  /** Full name on the account; never shown in full (SOC-P2). */
  name: string;
  visibility: Visibility;
  showFollowedSuburbs: boolean;
}

export const NOTIFY_TOPICS = {
  followed_updates: { label: "Updates on things I follow", detail: "Price, status and inspection changes on homes; new hub posts in suburbs." },
  hub_digest: { label: "Weekly suburb digest", detail: "One summary of the suburbs you follow." },
  marketing: { label: "News and offers from Landora", detail: "Product news and partner offers." },
} as const;
export type NotifyTopic = keyof typeof NOTIFY_TOPICS;
export const CHANNELS = { in_app: "In the app", email: "Email", push: "Push" } as const;
export type Channel = keyof typeof CHANNELS;
export type NotifyPrefs = Record<NotifyTopic, Record<Channel, boolean>>;

/** SOC-C2: in-app on for what you follow; email and push opt-in; marketing off everywhere. */
export function defaultPrefs(): NotifyPrefs {
  return {
    followed_updates: { in_app: true, email: false, push: false },
    hub_digest: { in_app: true, email: false, push: false },
    marketing: { in_app: false, email: false, push: false },
  };
}

export function isTopic(value: unknown): value is NotifyTopic {
  return typeof value === "string" && Object.hasOwn(NOTIFY_TOPICS, value);
}

export function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && Object.hasOwn(CHANNELS, value);
}

export function isFollowKind(value: unknown): value is FollowKind {
  return value === "suburb" || value === "listing" || value === "agent";
}

export interface SocialStore {
  readonly follows: Map<string, Follow[]>;
  readonly profiles: Map<string, Profile>;
  readonly prefs: Map<string, NotifyPrefs>;
  readonly questions: Question[];
  readonly reports: Report[];
  readonly posts: HubPost[];
}

export function createSocialStore(seed: Partial<Pick<SocialStore, "questions" | "posts" | "reports">> = {}): SocialStore {
  return {
    follows: new Map(),
    profiles: new Map(),
    prefs: new Map(),
    questions: seed.questions ?? [],
    reports: seed.reports ?? [],
    posts: seed.posts ?? [],
  };
}

// --- Profiles -------------------------------------------------------------------------------

/** First name and last initial (SOC-P2): "Sample Buyer" becomes "Sample B." */
export function displayNameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Landora member";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

export function profileOf(store: SocialStore, userId: string, name: string): Profile {
  // SOC-P1: private until the buyer chooses otherwise.
  return store.profiles.get(userId) ?? { name, visibility: "private", showFollowedSuburbs: false };
}

export interface PublicProfile {
  visible: boolean;
  displayName: string | null;
  followedSuburbIds: string[];
}

/** What other people see. Never includes saves, plans, notes, FHB answers or contact details (SOC-P3). */
export function publicView(profile: Profile, follows: readonly Follow[]): PublicProfile {
  if (profile.visibility === "private") return { visible: false, displayName: null, followedSuburbIds: [] };
  return {
    visible: true,
    displayName: displayNameOf(profile.name),
    followedSuburbIds: profile.showFollowedSuburbs ? follows.filter((f) => f.kind === "suburb").map((f) => f.targetId) : [],
  };
}

// --- Follows --------------------------------------------------------------------------------

export function followsOf(store: SocialStore, userId: string): readonly Follow[] {
  return store.follows.get(userId) ?? [];
}

export function isFollowing(store: SocialStore, userId: string, kind: FollowKind, targetId: string): boolean {
  return followsOf(store, userId).some((f) => f.kind === kind && f.targetId === targetId);
}

/** Returns the new state. Following is always an explicit choice (SOC-C1). */
export function setFollow(store: SocialStore, userId: string, kind: FollowKind, targetId: string, follow: boolean, now: Date = new Date()): boolean {
  const current = followsOf(store, userId).filter((f) => !(f.kind === kind && f.targetId === targetId));
  store.follows.set(userId, follow ? [...current, { kind, targetId, since: now.toISOString() }] : current);
  return follow;
}

// --- Questions and answers ------------------------------------------------------------------

export type Validation = { ok: true; value: string } | { ok: false; error: string };

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// Eight or more digits, allowing spaces, dots, dashes and brackets between them: Australian phone numbers.
const PHONE = /(?:\+?\d[\s().-]*){8,}/;
const LINK = /(https?:\/\/|www\.)\S+|\b\S+\.(com|au|net|org|io)\b/i;

/** SOC-M3: listing questions are short, and carry no contact details or links. */
export function validateQuestion(input: unknown): Validation {
  const value = typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
  if (value.length < 10) return { ok: false, error: "Write a question of at least 10 characters." };
  if (value.length > 300) return { ok: false, error: "Keep your question under 300 characters." };
  if (EMAIL.test(value) || PHONE.test(value)) return { ok: false, error: "Leave out phone numbers and email addresses. Questions are public once approved." };
  if (LINK.test(value)) return { ok: false, error: "Leave out links. Ask about this home in your own words." };
  return { ok: true, value };
}

export function validateAnswer(input: unknown): Validation {
  const value = typeof input === "string" ? input.trim() : "";
  if (value.length < 2) return { ok: false, error: "Write an answer." };
  if (value.length > 1000) return { ok: false, error: "Keep the answer under 1,000 characters." };
  return { ok: true, value };
}

/** What anyone can see on a listing: approved questions, with hidden answers left out (SOC-M5). */
export function publicQuestions(store: SocialStore, listingId?: string): Question[] {
  return store.questions
    .filter((q) => q.status === "published" && (listingId === undefined || q.listingId === listingId))
    .map((q) => (q.answer?.hidden ? { ...q, answer: null } : q))
    .sort((a, b) => b.askedAt.localeCompare(a.askedAt));
}

export function questionsBy(store: SocialStore, userId: string): Question[] {
  return store.questions.filter((q) => q.askerUserId === userId && q.status !== "removed").sort((a, b) => b.askedAt.localeCompare(a.askedAt));
}

/** New questions wait for a Moderator before anyone else sees them (FR-QA-001). */
export function askQuestion(store: SocialStore, input: { id: string; listingId: string; askerUserId: string; text: string }, now: Date = new Date()): Question {
  const q: Question = { ...input, status: "pending", askedAt: now.toISOString(), answer: null };
  store.questions.push(q);
  return q;
}

export function answerQuestion(store: SocialStore, questionId: string, agent: { agentId: string; agentName: string }, text: string, now: Date = new Date()): Question | null {
  const q = store.questions.find((x) => x.id === questionId);
  if (!q || q.status !== "published") return null;
  q.answer = { ...agent, text, answeredAt: now.toISOString(), hidden: false };
  return q;
}

// --- Reports and moderation -----------------------------------------------------------------

/** Files a report for the Moderator queue. Reported Q&A is hidden pending review (SOC-M5). */
export function fileReport(store: SocialStore, input: Omit<Report, "status" | "reportedAt">, now: Date = new Date()): Report | null {
  if (input.target === "post") {
    if (!store.posts.some((p) => p.id === input.targetId && !p.removed)) return null;
  } else {
    const q = store.questions.find((x) => x.id === input.targetId);
    if (!q || q.status !== "published" || (input.target === "answer" && !q.answer)) return null;
    if (input.target === "question") q.status = "hidden";
    else q.answer!.hidden = true;
  }
  const open = store.reports.find((r) => r.status === "open" && r.target === input.target && r.targetId === input.targetId && r.reporterUserId === input.reporterUserId);
  if (open) return open;
  const report: Report = { ...input, status: "open", reportedAt: now.toISOString() };
  store.reports.push(report);
  return report;
}

export function pendingQuestions(store: SocialStore): Question[] {
  return store.questions.filter((q) => q.status === "pending").sort((a, b) => a.askedAt.localeCompare(b.askedAt));
}

export function openReports(store: SocialStore): Report[] {
  return store.reports.filter((r) => r.status === "open").sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
}

export function moderationCount(store: SocialStore): number {
  return pendingQuestions(store).length + openReports(store).length;
}

/** Approve or reject a question waiting for moderation. */
export function decideQuestion(store: SocialStore, questionId: string, approve: boolean): Question | null {
  const q = store.questions.find((x) => x.id === questionId);
  if (!q || q.status !== "pending") return null;
  q.status = approve ? "published" : "rejected";
  return q;
}

/**
 * Uphold removes the content; dismiss restores it. Every open report on the same item closes together,
 * so one decision settles it.
 */
export function decideReport(store: SocialStore, reportId: string, uphold: boolean): Report | null {
  const report = store.reports.find((r) => r.id === reportId);
  if (!report || report.status !== "open") return null;
  for (const r of store.reports) {
    if (r.status === "open" && r.target === report.target && r.targetId === report.targetId) r.status = uphold ? "upheld" : "dismissed";
  }
  if (report.target === "post") {
    const post = store.posts.find((p) => p.id === report.targetId);
    if (post && uphold) post.removed = true;
  } else {
    const q = store.questions.find((x) => x.id === report.targetId);
    if (q && report.target === "question") q.status = uphold ? "removed" : "published";
    if (q?.answer && report.target === "answer") {
      if (uphold) q.answer = null;
      else q.answer.hidden = false;
    }
  }
  return report;
}

export function visiblePosts(store: SocialStore, suburbId?: string): HubPost[] {
  return store.posts.filter((p) => !p.removed && (suburbId === undefined || p.suburbId === suburbId)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
