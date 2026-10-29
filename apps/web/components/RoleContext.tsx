"use client";

import { createContext, useCallback, useContext, useTransition, type ReactNode } from "react";
import { setPrototypeRole } from "@/app/actions";
import { setAnalyticsRole } from "@/lib/analytics-client";
import type { Role } from "@/lib/roles";

// The viewer's role, read from the prototype cookie on the server and handed to client components.

interface RoleValue {
  role: Role;
  switching: boolean;
  switchTo: (role: Role) => void;
}

const RoleContext = createContext<RoleValue>({ role: "guest", switching: false, switchTo: () => undefined });

export function RoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  const [switching, start] = useTransition();
  setAnalyticsRole(role);
  const switchTo = useCallback((next: Role) => start(async () => void (await setPrototypeRole(next))), []);
  return <RoleContext.Provider value={{ role, switching, switchTo }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleValue {
  return useContext(RoleContext);
}
