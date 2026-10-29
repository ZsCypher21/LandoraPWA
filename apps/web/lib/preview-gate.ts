// Password gate for the hosted client preview (HTTP Basic auth). The prototype runs on synthetic data
// with a mock role switcher, so a hosted copy must not be open to the public or to crawlers.

export type GateEnv = {
  /** Password clients type in. Unset means no gate, unless we are on a hosted deployment. */
  password?: string | undefined;
  /** Username clients type in. Defaults to "landora". */
  user?: string | undefined;
  /** True on a hosted deployment (Vercel sets VERCEL=1). There, a missing password fails closed. */
  hosted: boolean;
};

export type GateDecision = { kind: "allow" } | { kind: "challenge" } | { kind: "misconfigured" };

export const PREVIEW_REALM = "Landora client preview";

/** Compares two strings in time that depends only on their lengths, not on where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/** Reads "Basic base64(user:password)". Returns null when the header is missing or malformed. */
export function parseBasicAuth(header: string | null): { user: string; password: string } | null {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header.trim());
  if (!match?.[1]) return null;
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return null;
  return { user: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
}

export function decideGate(env: GateEnv, authorization: string | null): GateDecision {
  const password = env.password?.trim() ?? "";
  if (!password) return env.hosted ? { kind: "misconfigured" } : { kind: "allow" };
  const creds = parseBasicAuth(authorization);
  if (!creds) return { kind: "challenge" };
  const userOk = safeEqual(creds.user, env.user?.trim() || "landora");
  const passwordOk = safeEqual(creds.password, password);
  return userOk && passwordOk ? { kind: "allow" } : { kind: "challenge" };
}
