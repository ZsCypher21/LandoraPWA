import Link from "next/link";
import type { ReactNode } from "react";
import { SearchBox } from "@/components/SearchBox";
import { datasetStats, suburbs } from "@/lib/data";

const EXAMPLES = [
  "3 bed house in Buderim under $900k with a pool",
  "2 bedroom unit to rent in Maroochydore under $700 per week",
  "townhouse with a big backyard open this Saturday",
  "land in Palmview between 350k and 450k",
];

const FEATURES: { href: string; title: string; body: string; icon: ReactNode }[] = [
  {
    href: "/search",
    title: "Search in your own words",
    body: "See exactly how we read your search and fix anything we got wrong. No hidden guesses.",
    icon: <path d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />,
  },
  {
    href: "/inspections",
    title: "Plan your inspections",
    body: "Turn saved homes into a route that fits open-home times, with drive and parking time built in.",
    icon: <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5zm2 2v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2z" />,
  },
  {
    href: "/first-home",
    title: "First home help",
    body: "Check which Queensland and federal schemes may apply, with sources and dates for every answer.",
    icon: <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />,
  },
];

export default function HomePage() {
  const stats = datasetStats();
  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <section className="relative -mx-4 overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-4 pb-10 pt-10 text-white sm:mx-0 sm:rounded-3xl sm:px-12 sm:pb-14 sm:pt-16">
        <svg viewBox="0 0 400 200" className="pointer-events-none absolute -right-20 bottom-0 h-64 w-auto opacity-15 sm:h-80" aria-hidden="true">
          <path d="M0 200V120l60-40 60 40v80zm140 0V90l80-60 80 60v110zm180 0v-70l40-30 40 30v70z" fill="currentColor" />
        </svg>
        <div className="relative flex max-w-2xl flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            Sunshine Coast pilot
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl">Find your next home, then plan the inspections.</h1>
          <p className="text-base text-white/80 sm:text-lg">
            Describe what you want in plain English. Landora shows how it read your search, and only lists homes from verified agents.
          </p>
          <div className="text-ink">
            <SearchBox autoFocus size="lg" />
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Example searches">
            {EXAMPLES.map((e) => (
              <Link
                key={e}
                href={`/search?q=${encodeURIComponent(e)}`}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/90 ring-1 ring-white/20 transition hover:bg-white/20 sm:text-sm"
              >
                {e}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="What you can do">
        {FEATURES.map((c) => (
          <Link key={c.href} href={c.href} className="group card flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                {c.icon}
              </svg>
            </span>
            <h2 className="text-lg font-bold">{c.title}</h2>
            <p className="text-sm text-muted">{c.body}</p>
            <span className="mt-auto text-sm font-semibold text-brand-700">
              Get started <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="card grid grid-cols-3 divide-x divide-line text-center" aria-label="Prototype data">
        <div className="p-4 sm:p-6">
          <p className="font-display text-2xl font-extrabold text-brand-700 sm:text-3xl">{stats.published}</p>
          <p className="mt-1 text-xs text-muted sm:text-sm">homes published</p>
        </div>
        <div className="p-4 sm:p-6">
          <p className="font-display text-2xl font-extrabold text-brand-700 sm:text-3xl">{suburbs().length}</p>
          <p className="mt-1 text-xs text-muted sm:text-sm">pilot suburbs</p>
        </div>
        <div className="p-4 sm:p-6">
          <p className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{stats.blocked}</p>
          <p className="mt-1 text-xs text-muted sm:text-sm">held back by the Queensland compliance check</p>
        </div>
      </section>
    </div>
  );
}
