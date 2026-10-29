import type { ReactNode } from "react";
import { accessTo } from "@/lib/roles";
import { currentRole } from "@/lib/session";
import { AccessDenied } from "./AccessDenied";
import { SignInPrompt } from "./SignInPrompt";

/** Server-side page check (FR-ACC-002): guests are asked to sign in, other roles are refused. */
export async function PageGuard({ path, signIn, children }: { path: string; signIn: { title: string; body: string }; children: ReactNode }) {
  const role = await currentRole();
  const access = accessTo(role, path);
  if (access.allowed) return children;
  return access.reason === "sign_in" ? <SignInPrompt title={signIn.title} body={signIn.body} /> : <AccessDenied role={role} allowedRoles={access.allowedRoles} />;
}
