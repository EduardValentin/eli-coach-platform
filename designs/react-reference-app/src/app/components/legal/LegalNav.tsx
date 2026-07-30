import { Link } from 'react-router';

const LEGAL_LINK_CLASS =
  'font-medium text-copy-muted transition-colors hover:text-foreground';

export function LegalNav({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm ${className}`}
    >
      <Link to="/privacy" className={LEGAL_LINK_CLASS}>
        Privacy Policy
      </Link>
      <Link to="/terms" className={LEGAL_LINK_CLASS}>
        Terms &amp; Conditions
      </Link>
    </nav>
  );
}

export function LegalFooter() {
  return (
    <footer className="bg-surface-page text-copy-muted">
      <LegalNav className="mx-auto max-w-[90rem] px-6 py-8 lg:px-12" />
    </footer>
  );
}
