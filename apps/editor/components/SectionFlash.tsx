"use client";

import { useEffect, useRef } from "react";

/**
 * Flashes the section <article> that was just added in the builder.
 *
 * The section list is server-rendered (the add action revalidates the route),
 * so there's no client state telling us which one is new. Instead we diff the
 * section ids across renders: when a new id appears, we highlight + scroll to
 * the matching `#section-{id}` element. Reduced-motion users get an instant
 * scroll and no flash.
 */
export function SectionFlash({ sectionIds }: { sectionIds: string[] }) {
  const prev = useRef<string[] | null>(null);
  const key = sectionIds.join(",");

  useEffect(() => {
    const previous = prev.current;
    prev.current = sectionIds;
    // First render: record the baseline, don't flash pre-existing sections.
    if (previous === null) return;

    const added = sectionIds.filter((id) => !previous.includes(id));
    if (added.length === 0) return;

    const el = document.getElementById(`section-${added[added.length - 1]}`);
    if (!el) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    if (reduced) return;

    el.classList.add("flash-new");
    const t = window.setTimeout(() => el.classList.remove("flash-new"), 1600);
    return () => window.clearTimeout(t);
    // `key` is the stable signal for "the set of sections changed".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
