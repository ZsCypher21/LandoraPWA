import { describe, expect, it } from "vitest";
import { ROLES, accessTo, can, navFor } from "./roles";
import {
  AUTHOR_KINDS,
  answerQuestion,
  askQuestion,
  createSocialStore,
  decideQuestion,
  decideReport,
  defaultPrefs,
  displayNameOf,
  fileReport,
  isFollowing,
  moderationCount,
  profileOf,
  publicQuestions,
  publicView,
  setFollow,
  validateQuestion,
  visiblePosts,
  type HubPost,
} from "./social";

const NOW = new Date("2026-10-29T00:00:00Z");

function post(id: string, suburbId = "s1"): HubPost {
  return { id, suburbId, kind: "market_wrap", title: "Wrap", body: "Body", authorName: "Desk", authorKind: "landora_editorial", source: "Sample", publishedAt: NOW.toISOString(), approvedOn: "2026-10-28", removed: false };
}

/** A store with one approved question on listing L1. */
function withPublished() {
  const store = createSocialStore({ posts: [post("p1")] });
  askQuestion(store, { id: "q1", listingId: "L1", askerUserId: "buyer", text: "Is the yard fenced?" }, NOW);
  decideQuestion(store, "q1", true);
  return store;
}

describe("social permissions (ADR 0012)", () => {
  it("gives social actions to the right roles only", () => {
    expect(ROLES.filter((r) => can(r, "social.follow"))).toEqual(["buyer"]);
    expect(ROLES.filter((r) => can(r, "qa.ask"))).toEqual(["buyer"]);
    expect(ROLES.filter((r) => can(r, "qa.answer"))).toEqual(["agent", "agency_admin"]);
    expect(ROLES.filter((r) => can(r, "content.report"))).toEqual(["buyer"]);
    expect(ROLES.filter((r) => can(r, "moderation.decide"))).toEqual(["moderator", "platform_admin"]);
  });

  it("keeps the hub public but the buyer's follows and profile private", () => {
    expect(accessTo("guest", "/hub").allowed).toBe(true);
    expect(accessTo("guest", "/hub/some-suburb").allowed).toBe(true);
    expect(accessTo("guest", "/hub/following")).toMatchObject({ allowed: false, reason: "sign_in" });
    expect(accessTo("agent", "/hub/profile")).toMatchObject({ allowed: false, reason: "forbidden" });
    for (const role of ROLES) expect(navFor(role).some((n) => n.href === "/hub")).toBe(true);
  });

  it("has no AI or concierge author for hub posts (SOC-A1)", () => {
    expect(AUTHOR_KINDS.some((k) => /ai|concierge|bot|model/i.test(k))).toBe(false);
  });
});

describe("profiles and follows", () => {
  it("starts private and shows nothing until the buyer opts in (SOC-P1, SOC-P2)", () => {
    const store = createSocialStore();
    const profile = profileOf(store, "buyer", "Sample Buyer");
    expect(profile.visibility).toBe("private");
    setFollow(store, "buyer", "suburb", "s1", true, NOW);
    expect(publicView(profile, store.follows.get("buyer")!)).toEqual({ visible: false, displayName: null, followedSuburbIds: [] });
    expect(publicView({ ...profile, visibility: "public" }, store.follows.get("buyer")!)).toEqual({ visible: true, displayName: "Sample B.", followedSuburbIds: [] });
    expect(publicView({ ...profile, visibility: "public", showFollowedSuburbs: true }, store.follows.get("buyer")!).followedSuburbIds).toEqual(["s1"]);
  });

  it("never shows followed homes or agents on a profile (SOC-P3)", () => {
    const store = createSocialStore();
    setFollow(store, "buyer", "listing", "L1", true, NOW);
    setFollow(store, "buyer", "agent", "A1", true, NOW);
    expect(publicView({ name: "A B", visibility: "public", showFollowedSuburbs: true }, store.follows.get("buyer")!).followedSuburbIds).toEqual([]);
  });

  it("shortens names to first name and last initial", () => {
    expect(displayNameOf("Sample Buyer")).toBe("Sample B.");
    expect(displayNameOf("  Mary Jane van der Berg ")).toBe("Mary B.");
    expect(displayNameOf("Cher")).toBe("Cher");
    expect(displayNameOf("")).toBe("Landora member");
  });

  it("follows and unfollows without duplicates", () => {
    const store = createSocialStore();
    setFollow(store, "buyer", "suburb", "s1", true, NOW);
    setFollow(store, "buyer", "suburb", "s1", true, NOW);
    expect(store.follows.get("buyer")).toHaveLength(1);
    setFollow(store, "buyer", "suburb", "s1", false, NOW);
    expect(isFollowing(store, "buyer", "suburb", "s1")).toBe(false);
  });

  it("defaults email, push and marketing to off (SOC-C2)", () => {
    const p = defaultPrefs();
    expect(p.followed_updates.in_app).toBe(true);
    for (const topic of Object.values(p)) {
      expect(topic.email).toBe(false);
      expect(topic.push).toBe(false);
    }
    expect(Object.values(p.marketing).some(Boolean)).toBe(false);
  });
});

describe("listing Q&A (FR-QA-001)", () => {
  it("holds new questions for moderation", () => {
    const store = createSocialStore();
    askQuestion(store, { id: "q1", listingId: "L1", askerUserId: "buyer", text: "Is the yard fenced?" }, NOW);
    expect(publicQuestions(store, "L1")).toEqual([]);
    expect(moderationCount(store)).toBe(1);
    decideQuestion(store, "q1", true);
    expect(publicQuestions(store, "L1").map((q) => q.id)).toEqual(["q1"]);
    expect(decideQuestion(store, "q1", false)).toBeNull();
  });

  it("only lets agents answer approved questions", () => {
    const store = createSocialStore();
    askQuestion(store, { id: "q1", listingId: "L1", askerUserId: "buyer", text: "Is the yard fenced?" }, NOW);
    expect(answerQuestion(store, "q1", { agentId: "A1", agentName: "Casey" }, "Yes", NOW)).toBeNull();
    decideQuestion(store, "q1", true);
    expect(answerQuestion(store, "q1", { agentId: "A1", agentName: "Casey" }, "Yes", NOW)?.answer?.agentName).toBe("Casey");
  });

  it("rejects contact details, links and too-short questions (SOC-M3)", () => {
    expect(validateQuestion("Is the yard fenced?")).toEqual({ ok: true, value: "Is the yard fenced?" });
    expect(validateQuestion("short").ok).toBe(false);
    expect(validateQuestion("Call me on 0412 345 678 about it").ok).toBe(false);
    expect(validateQuestion("Email me at me@example.com please").ok).toBe(false);
    expect(validateQuestion("See https://example.com for my offer").ok).toBe(false);
    expect(validateQuestion("x".repeat(301)).ok).toBe(false);
    expect(validateQuestion(42).ok).toBe(false);
    // Numbers that aren't phone numbers are fine.
    expect(validateQuestion("Is the 2 bedroom unit on level 3?").ok).toBe(true);
  });
});

describe("reports and moderation (SOC-M5)", () => {
  it("hides a reported question until a moderator restores it", () => {
    const store = withPublished();
    const r = fileReport(store, { id: "r1", target: "question", targetId: "q1", reason: "offensive", reporterUserId: "b2" }, NOW)!;
    expect(publicQuestions(store, "L1")).toEqual([]);
    expect(decideReport(store, r.id, false)?.status).toBe("dismissed");
    expect(publicQuestions(store, "L1")).toHaveLength(1);
  });

  it("removes a reported question when the report is upheld", () => {
    const store = withPublished();
    fileReport(store, { id: "r1", target: "question", targetId: "q1", reason: "spam", reporterUserId: "b2" }, NOW);
    decideReport(store, "r1", true);
    expect(store.questions[0]!.status).toBe("removed");
    expect(moderationCount(store)).toBe(0);
  });

  it("hides only the answer when the answer is reported", () => {
    const store = withPublished();
    answerQuestion(store, "q1", { agentId: "A1", agentName: "Casey" }, "Yes", NOW);
    fileReport(store, { id: "r1", target: "answer", targetId: "q1", reason: "inaccurate", reporterUserId: "b2" }, NOW);
    expect(publicQuestions(store, "L1")[0]!.answer).toBeNull();
    decideReport(store, "r1", true);
    expect(store.questions[0]!.answer).toBeNull();
    expect(publicQuestions(store, "L1")).toHaveLength(1);
  });

  it("keeps an approved post visible until a moderator removes it", () => {
    const store = withPublished();
    fileReport(store, { id: "r1", target: "post", targetId: "p1", reason: "inaccurate", reporterUserId: "b2" }, NOW);
    expect(visiblePosts(store)).toHaveLength(1);
    decideReport(store, "r1", true);
    expect(visiblePosts(store)).toHaveLength(0);
  });

  it("closes every open report on the same item with one decision", () => {
    const store = withPublished();
    fileReport(store, { id: "r1", target: "post", targetId: "p1", reason: "spam", reporterUserId: "b2" }, NOW);
    fileReport(store, { id: "r2", target: "post", targetId: "p1", reason: "spam", reporterUserId: "b3" }, NOW);
    decideReport(store, "r2", false);
    expect(store.reports.map((r) => r.status)).toEqual(["dismissed", "dismissed"]);
  });

  it("refuses reports on content that's missing or already under review", () => {
    const store = withPublished();
    expect(fileReport(store, { id: "r1", target: "question", targetId: "nope", reason: "spam", reporterUserId: "b2" }, NOW)).toBeNull();
    expect(fileReport(store, { id: "r2", target: "answer", targetId: "q1", reason: "spam", reporterUserId: "b2" }, NOW)).toBeNull();
    fileReport(store, { id: "r3", target: "question", targetId: "q1", reason: "spam", reporterUserId: "b2" }, NOW);
    expect(fileReport(store, { id: "r4", target: "question", targetId: "q1", reason: "spam", reporterUserId: "b3" }, NOW)).toBeNull();
  });
});
