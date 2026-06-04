"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

export interface PaletteItem {
  key: string;
  category: string;
  label: string;
  description: string;
}

/**
 * Add-a-section palette. Instead of submitting the whole builder form (full
 * navigation), it reads the form's current values to preserve in-progress
 * edits, calls the bound server action in a transition (which persists +
 * revalidates), and lets the inspector + live preview update in place.
 *
 * `templates` is passed in (not imported from cms-client) so this client
 * component never pulls server-only modules into the browser bundle.
 */
export function SectionPalette({
  formId,
  templates,
  addSection
}: {
  formId: string;
  templates: PaletteItem[];
  addSection: (templateKey: string, formData: FormData) => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [addingKey, setAddingKey] = useState<string | null>(null);

  function add(key: string) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();
    setAddingKey(key);
    startTransition(async () => {
      await addSection(key, fd);
      setAddingKey(null);
    });
  }

  return (
    <div className="mt-10 border border-dashed border-border bg-surface p-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Add a section</p>
      <p className="mt-1 text-sm text-text-muted">
        Only brand-approved templates are available — every option stays on-brand and SEO-ready.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const isAdding = addingKey === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => add(t.key)}
              disabled={pending}
              className="group card-interactive flex flex-col items-start border border-border bg-bg p-4 text-left hover:border-brand disabled:pointer-events-none disabled:opacity-60"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-brand">{t.category}</span>
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                ) : (
                  <Plus className="h-4 w-4 text-text-muted transition-transform duration-200 ease-out group-hover:rotate-90 group-hover:text-brand" />
                )}
              </div>
              <span className="mt-2 text-sm font-semibold text-text">{t.label}</span>
              <span className="mt-1 text-xs leading-relaxed text-text-muted">
                {isAdding ? "Adding…" : t.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
