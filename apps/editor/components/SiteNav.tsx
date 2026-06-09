import Link from "next/link";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" }
];

export function SiteNav() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-text">
          <span className="inline-block h-3 w-3 bg-brand" aria-hidden="true" />
          Company<span className="text-brand">CMS</span>
        </Link>
        <nav className="hidden items-center gap-10 text-sm text-text-body md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="link-underline transition-colors hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="press hidden h-9 items-center rounded-md border border-border-emphasis px-4 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand md:inline-flex"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
