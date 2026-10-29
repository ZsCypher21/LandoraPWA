import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav, NavLinks } from "@/components/NavLinks";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { RoleProvider } from "@/components/RoleContext";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { currentRole } from "@/lib/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Landora (prototype)", template: "%s · Landora (prototype)" },
  description: "Buyer-first property search for the Sunshine Coast. Design-stage prototype on synthetic data.",
  manifest: "/manifest.webmanifest",
  // Prototype on synthetic data: keep it out of search engines.
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0e8a67",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const role = await currentRole();
  return (
    <html lang="en-AU" className={`${inter.variable} ${jakarta.variable} scroll-pt-24`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <RoleProvider role={role}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
            Skip to content
          </a>
          <div role="note" className="bg-ink px-4 py-1.5 text-center text-[11px] text-white/80 sm:text-xs">
            Prototype · every listing, agent, price and valuation is <strong className="font-semibold text-white">synthetic and fictional</strong>
          </div>
          <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/90 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16">
              <Link href="/" className="group flex items-center gap-2 rounded-xl" aria-label="Landora home">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br transition group-hover:scale-105 from-brand-500 to-brand-800 text-white shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
                    <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />
                  </svg>
                </span>
                <span className="font-display text-lg font-bold tracking-tight">Landora</span>
              </Link>
              <div className="flex items-center gap-3">
                <NavLinks />
                <span className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
                <RoleSwitcher />
              </div>
            </div>
          </header>
          <div className="relative isolate flex-1">
            {/* Soft brand-and-sunshine wash behind each page's title, so pages don't all read as flat grey. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60rem_18rem_at_15%_-10%,rgb(14_138_103/0.16),transparent_70%),radial-gradient(40rem_16rem_at_90%_-20%,rgb(246_177_61/0.18),transparent_70%)]"
            />
            <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:pb-16 sm:pt-8">
              {children}
            </main>
          </div>
          <footer className="bg-ink pb-28 pt-8 text-sm text-white/70 sm:pb-8">
            <div className="mx-auto flex max-w-6xl flex-col px-4 gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-display font-bold text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />
                  </svg>
                </span>
                Landora <span className="font-sans text-xs font-normal text-white/60">Sunshine Coast pilot</span>
              </span>
              <p className="text-xs">General information only. Landora does not give financial or legal advice.</p>
            </div>
          </footer>
          <BottomNav />
          <RegisterServiceWorker />
        </RoleProvider>
      </body>
    </html>
  );
}
