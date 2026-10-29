// Role-based access control for the five V11 roles (FR-ACC-002, §12.5), plus "guest" for a
// signed-out visitor. Pure and framework-free so the same table can back real sessions later
// (ADR 0011): only where the role comes from changes, not what each role may do.

export const ROLES = ["guest", "buyer", "agent", "agency_admin", "moderator", "platform_admin"] as const;
export type Role = (typeof ROLES)[number];
/** Roles a user account can hold; "guest" is the absence of a session. Matches user_role.role in migration 0001. */
export type AccountRole = Exclude<Role, "guest">;

export const ROLE_LABELS: Record<Role, string> = {
  guest: "Guest",
  buyer: "Buyer",
  agent: "Agent",
  agency_admin: "Agency admin",
  moderator: "Moderator",
  platform_admin: "Platform admin",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const PERMISSIONS = [
  "buyer.save",
  "buyer.share",
  "listing.share",
  "buyer.inspections",
  "buyer.account",
  "agent.console",
  "listing.publish",
  "agency.view",
  "admin.console",
  "admin.roles.change",
  "admin.verification.decide",
  "moderation.decide",
  "audit.view",
  "social.follow",
  "social.profile",
  "qa.ask",
  "qa.answer",
  "content.report",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Least privilege: each permission names exactly the roles that need it. Anything unlisted is denied.
const GRANTS: Record<Permission, readonly Role[]> = {
  "buyer.save": ["buyer"],
  "buyer.share": ["buyer"],
  // Sharing a public listing link is open to guests too: it brings in new buyers (ADR 0011).
  "listing.share": ["guest", "buyer"],
  "buyer.inspections": ["buyer"],
  "buyer.account": ["buyer"],
  "agent.console": ["agent", "agency_admin"],
  "listing.publish": ["agent", "agency_admin"],
  "agency.view": ["agency_admin"],
  "admin.console": ["moderator", "platform_admin"],
  "admin.roles.change": ["platform_admin"],
  "admin.verification.decide": ["platform_admin"],
  "moderation.decide": ["moderator", "platform_admin"],
  "audit.view": ["moderator", "platform_admin"],
  // Social preview (ADR 0012). The concierge is not a role, so it can never hold these (SOC-A1).
  "social.follow": ["buyer"],
  "social.profile": ["buyer"],
  "qa.ask": ["buyer"],
  // Agents answer only on listings they manage; the server action checks that scope too (SOC-M4).
  "qa.answer": ["agent", "agency_admin"],
  "content.report": ["buyer"],
};

export function can(role: Role, permission: Permission): boolean {
  return GRANTS[permission].includes(role);
}

export function rolesWith(permission: Permission): readonly Role[] {
  return GRANTS[permission];
}

/** Protected pages and the permission each needs. Pages not listed are public (search, listings, first home). */
const ROUTES: readonly { prefix: string; permission: Permission }[] = [
  { prefix: "/account", permission: "buyer.account" },
  { prefix: "/shortlist", permission: "buyer.save" },
  { prefix: "/inspections", permission: "buyer.inspections" },
  { prefix: "/agent", permission: "agent.console" },
  { prefix: "/admin", permission: "admin.console" },
  { prefix: "/hub/following", permission: "social.follow" },
  { prefix: "/hub/profile", permission: "social.profile" },
];

export function routePermission(pathname: string): Permission | null {
  return ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))?.permission ?? null;
}

export type Access = { allowed: true } | { allowed: false; reason: "sign_in" | "forbidden"; allowedRoles: readonly Role[] };

/** Guests are asked to sign in; signed-in users with the wrong role are refused. */
export function accessTo(role: Role, pathname: string): Access {
  const permission = routePermission(pathname);
  if (permission === null || can(role, permission)) return { allowed: true };
  return { allowed: false, reason: role === "guest" ? "sign_in" : "forbidden", allowedRoles: rolesWith(permission) };
}

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  short: string;
  icon: "search" | "saved" | "inspections" | "first-home" | "account" | "console" | "admin" | "hub";
}

const SEARCH: NavItem = { href: "/search", label: "Search", short: "Search", icon: "search" };
const SAVED: NavItem = { href: "/shortlist", label: "Saved", short: "Saved", icon: "saved" };
const INSPECTIONS: NavItem = { href: "/inspections", label: "Inspections", short: "Inspect", icon: "inspections" };
const FIRST_HOME: NavItem = { href: "/first-home", label: "First home", short: "First home", icon: "first-home" };
const HUB: NavItem = { href: "/hub", label: "Hub", short: "Hub", icon: "hub" };

const NAV: Record<Role, readonly NavItem[]> = {
  // Guests see the buyer tools so they can discover them; those pages ask them to sign in.
  guest: [SEARCH, SAVED, INSPECTIONS, FIRST_HOME, HUB],
  buyer: [SEARCH, SAVED, INSPECTIONS, FIRST_HOME, HUB, { href: "/account", label: "Account", short: "Account", icon: "account" }],
  agent: [SEARCH, HUB, { href: "/agent", label: "Agent console", short: "Console", icon: "console" }],
  agency_admin: [SEARCH, HUB, { href: "/agent", label: "Agency console", short: "Console", icon: "console" }],
  moderator: [SEARCH, HUB, { href: "/admin", label: "Admin", short: "Admin", icon: "admin" }],
  platform_admin: [SEARCH, HUB, { href: "/admin", label: "Admin", short: "Admin", icon: "admin" }],
};

export function navFor(role: Role): readonly NavItem[] {
  return NAV[role];
}

/** Where a role starts: used by "access denied" to offer a way back. */
export function homeFor(role: Role): { href: string; label: string } {
  if (can(role, "agent.console")) return { href: "/agent", label: "Go to your console" };
  if (can(role, "admin.console")) return { href: "/admin", label: "Go to the admin console" };
  return { href: "/search", label: "Go to search" };
}

/** Roles a platform admin may assign. Agent roles are scoped to an agency (migration 0001), so they need one. */
export function assignableRoles(hasAgency: boolean): readonly AccountRole[] {
  return hasAgency ? ["agent", "agency_admin"] : ["buyer", "moderator", "platform_admin"];
}
