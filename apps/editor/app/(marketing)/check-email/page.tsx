import Link from "next/link";
import { Mail, Terminal } from "lucide-react";

export default async function CheckEmailPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const sp = await searchParams;
  const email = sp.email ?? "your inbox";

  return (
    <section>
      <div className="mx-auto max-w-2xl px-6 py-24 md:px-10 md:py-32">
        <div className="mb-10 flex h-14 w-14 items-center justify-center border border-border bg-bg">
          <Mail className="h-6 w-6 text-brand" aria-hidden="true" />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          Check your inbox
        </p>
        <h1 className="mt-3 text-h1 text-text">
          Magic link on the way.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-text-body">
          We sent a sign-in link to <span className="font-medium text-text">{email}</span>.
          Open it on this device to continue. The link expires in 15 minutes.
        </p>

        <div className="mt-12 border border-border bg-surface p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            Dev mode
          </div>
          <p className="mt-3 text-sm text-text-body">
            No email provider is configured for local development. The magic-link URL is printed
            in the API server console. Look for a block labeled <code className="border border-border bg-bg px-1.5 py-0.5 text-xs font-mono">MAGIC LINK (dev only)</code> and click that URL.
          </p>
        </div>

        <div className="mt-10 flex items-center gap-6 text-sm">
          <Link href="/" className="text-brand hover:text-brand-hover">
            Use a different email
          </Link>
          <span className="text-text-muted">·</span>
          <Link href="/docs" className="text-text-body hover:text-text">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
