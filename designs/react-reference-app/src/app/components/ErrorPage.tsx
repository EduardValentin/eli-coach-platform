import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';
import { buttonVariants } from './ThemeButton';

// Shared by every dead end (404, 403, failed sign-in). Production replaces the
// whole route tree for these, so the page carries no navigation bar or footer
// and offers exactly one way out.
export const ERROR_PAGE_ACTION_CLASS = buttonVariants({ size: 'lg', variant: 'inverted' });

export const FULL_PAGE_MESSAGE_SHELL_CLASS =
  'w-full min-h-screen bg-surface-page flex flex-col items-center justify-center px-6 py-16 text-center';

export function ErrorPage({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  landmarkLabel = 'Error',
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  landmarkLabel?: string;
}) {
  return (
    <main aria-label={landmarkLabel} className={FULL_PAGE_MESSAGE_SHELL_CLASS}>
      <div className="w-20 h-20 bg-surface-subtle text-muted-foreground rounded-full flex items-center justify-center mb-6">
        <Icon size={36} aria-hidden="true" />
      </div>
      <SectionEyebrow variant="muted">{eyebrow}</SectionEyebrow>
      <h1 className="font-serif text-display-md text-text-primary tracking-tight">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-lg text-text-secondary leading-relaxed">
        {description}
      </p>
      <div className="mt-8 flex justify-center">{children}</div>
    </main>
  );
}
