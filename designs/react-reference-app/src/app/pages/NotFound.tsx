import { Link } from 'react-router';
import { ArrowRight, Compass } from 'lucide-react';
import { SectionEyebrow } from '../components/SectionEyebrow';

// Mirrors the production root error boundary, which replaces the whole route
// tree and so renders without the navigation bar or footer. A dead end offers
// one way out rather than the site chrome.
export function NotFound() {
  return (
    <main
      aria-label="Error"
      className="w-full min-h-screen bg-surface-page flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="w-20 h-20 bg-surface-subtle text-copy-muted rounded-full flex items-center justify-center mb-6">
        <Compass size={36} aria-hidden="true" />
      </div>
      <SectionEyebrow variant="muted">Error 404</SectionEyebrow>
      <h1 className="font-serif text-4xl text-foreground tracking-tight">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-lg text-copy-muted leading-relaxed">
        The page you asked for doesn&apos;t exist, or it has moved somewhere
        else.
      </p>
      <Link
        to="/"
        className="mt-8 px-7 py-4 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-full inline-flex items-center justify-center gap-2 hover:bg-brand transition-colors"
      >
        Back to home <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </main>
  );
}
