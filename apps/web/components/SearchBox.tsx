// Plain GET form so search works before JavaScript loads and the URL is always shareable.
export function SearchBox({ defaultValue = "", autoFocus = false, size = "md" }: { defaultValue?: string; autoFocus?: boolean; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={`flex w-full items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 shadow-card transition focus-within:border-brand-600 focus-within:shadow-lift focus-within:ring-4 focus-within:ring-brand-500/25 ${lg ? "sm:p-2 sm:pl-5" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="currentColor" aria-hidden="true">
        <path d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
      </svg>
      <label htmlFor="q" className="sr-only">
        Describe the home you want
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        maxLength={300}
        placeholder="Try “3 bed house in Buderim under $900k”"
        className={`min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none placeholder:text-muted/70 ${lg ? "min-h-11 sm:text-lg" : "min-h-10"}`}
      />
      <button type="submit" className={`btn btn-primary shrink-0 ${lg ? "sm:min-h-12 sm:px-7 sm:text-base" : ""}`}>
        Search
      </button>
    </form>
  );
}
