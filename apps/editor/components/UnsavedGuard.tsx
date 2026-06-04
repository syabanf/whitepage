"use client";

import { useEffect } from "react";

/**
 * Warns before a full page unload (refresh / tab close / external nav) when the
 * tracked form has unsaved edits. Cleared on submit since that's an intentional
 * save+navigate. Scoped to the form with the given id.
 */
export function UnsavedGuard({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;

    let dirty = false;
    const markDirty = () => {
      dirty = true;
    };
    const clear = () => {
      dirty = false;
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", clear);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", clear);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [formId]);

  return null;
}
