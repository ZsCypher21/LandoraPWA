import type { ReactNode } from "react";
import { PreviewBanner } from "@/components/social/PreviewBanner";
import { moderationCount } from "@/lib/social";
import { socialStore } from "@/lib/social-store";
import { HubNav } from "./HubNav";

export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <PreviewBanner />
      <HubNav moderationCount={moderationCount(socialStore())} />
      {children}
    </div>
  );
}
