"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestMagicLink,
  signInAsDemo,
  signInWithPassword
} from "@/lib/auth/actions";

type Mode = "password" | "magic";

export function AuthCard({ error }: { error: string | null }) {
  const [mode, setMode] = useState<Mode>("password");

  return (
    <div className="w-full border border-border bg-bg p-8 md:p-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
        Sign in
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">
        Welcome back
      </h2>

      {/* Tabs */}
      <div className="mt-7 flex border-b border-border">
        <TabButton active={mode === "password"} onClick={() => setMode("password")}>
          Password
        </TabButton>
        <TabButton active={mode === "magic"} onClick={() => setMode("magic")}>
          Magic link
        </TabButton>
      </div>

      {error && (
        <div className="mt-5 border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {mode === "password" ? (
        <form action={signInWithPassword} className="mt-6 space-y-5" key="password">
          <Field id="pw-email" label="Work email">
            <Input id="pw-email" type="email" name="email" required placeholder="you@company.com" autoComplete="email" />
          </Field>
          <Field id="pw-password" label="Password">
            <Input id="pw-password" type="password" name="password" required autoComplete="current-password" />
          </Field>
          <Button type="submit" className="w-full" size="lg">
            <KeyRound className="mr-2 h-4 w-4" />
            Sign in
          </Button>
        </form>
      ) : (
        <form action={requestMagicLink} className="mt-6 space-y-5" key="magic">
          <Field id="ml-email" label="Work email">
            <Input id="ml-email" type="email" name="email" required placeholder="you@company.com" autoComplete="email" />
          </Field>
          <Button type="submit" className="w-full" size="lg">
            <Mail className="mr-2 h-4 w-4" />
            Send magic link
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-text-muted">
            No password needed — we&apos;ll email you a sign-in link.
          </p>
        </form>
      )}

      {/* Demo */}
      <div className="mt-7 border-t border-border pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          Or try the demo
        </p>
        <div className="mt-3 border border-border bg-surface p-4">
          <p className="text-xs text-text-body">One-click into a sample workspace.</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-text-muted">
            <span>demo@cms.app</span>
            <span className="text-border-emphasis">·</span>
            <span>cms-demo-2026</span>
          </div>
          <form action={signInAsDemo} className="mt-4">
            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-brand bg-bg text-sm font-medium text-brand transition-colors hover:bg-brand-subtle"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Sign in as demo
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        New here?{" "}
        <a href="/" className="text-brand hover:text-brand-hover">
          Request access
        </a>
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-brand text-text"
          : "border-transparent text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  children
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-text">
        {label}
      </label>
      {children}
    </div>
  );
}
