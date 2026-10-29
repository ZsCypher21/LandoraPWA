import type { Metadata } from "next";
import { FhbCheck } from "./FhbCheck";

export const metadata: Metadata = { title: "First home help" };

export default function FirstHomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <span className="eyebrow">First home buyers · Queensland</span>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">What first home help could you get?</h1>
        <p className="mt-1 text-muted">
          Answer a few questions to see which Queensland and federal first home schemes may apply. This is general information from official program rules, not financial advice.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zm0 10.9h6c-.5 3.6-2.9 6.8-6 7.8z" />
          </svg>
          Your answers are used only for this check. They are not saved or shared, and we don't ask about your income because none of these schemes currently depend on it.
        </p>
      </div>
      <FhbCheck />
    </div>
  );
}
