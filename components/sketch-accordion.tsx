"use client";

import { useState } from "react";
import { SurveyForm } from "@/components/survey-form";

export function SketchAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="my-10 flex items-center gap-4 text-sm">
        <span className="h-px flex-1 bg-line" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-ink-soft transition-colors hover:text-ink"
        >
          or sketch a person instead
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <span className="h-px flex-1 bg-line" />
      </div>

      {open && (
        <section className="pb-16 animate-in fade-in slide-in-from-top-2 duration-200">
          <SurveyForm />
        </section>
      )}
    </>
  );
}
