"use client";

import { Trash2 } from "lucide-react";

/**
 * Submits a delete server action after a confirm() prompt.
 * - In its own <form action={deleteX}>: omit formAction (submits the form).
 * - Inside a larger form: pass formAction to submit that action instead.
 */
export function DeleteButton({
  label = "Delete",
  confirmText,
  formAction
}: {
  label?: string;
  confirmText: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-danger"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
