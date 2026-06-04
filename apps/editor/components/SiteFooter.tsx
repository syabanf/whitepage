import Link from "next/link";

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 text-sm text-text-muted md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 bg-brand" aria-hidden="true" />
          <span>CompanyCMS &copy; {year}</span>
          <span className="ml-2 hidden text-text-muted/60 md:inline">Marketing-safe websites. Built for SEO.</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="transition-colors hover:text-text">Privacy</Link>
          <Link href="/" className="transition-colors hover:text-text">Terms</Link>
          <Link href="/" className="transition-colors hover:text-text">Status</Link>
          <Link href="/" className="transition-colors hover:text-text">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
