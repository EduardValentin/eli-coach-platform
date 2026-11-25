import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';
import { Link, type LinkProps } from 'react-router';
import { SectionEyebrow } from './SectionEyebrow';
import { buttonVariants } from './ui/button';
import { cn } from './ui/utils';

// Shared by every dead end (404, 403, failed sign-in). Production replaces the
// whole route tree for these, so the page carries no navigation bar or footer
// and offers exactly one way out.
export const ERROR_PAGE_ACTION_CLASS = buttonVariants({ size: 'lg', variant: 'inverted' });

type DeadEndLinkProps = {
  to: LinkProps['to'];
  direction: 'back' | 'forward';
  className?: string;
  children: ReactNode;
};

export function DeadEndLink({ to, direction, className, children }: DeadEndLinkProps) {
  return (
    <Link to={to} className={cn(ERROR_PAGE_ACTION_CLASS, className)}>
      {direction === 'back' ? <ArrowLeft size={18} aria-hidden="true" /> : null}
      {children}
      {direction === 'forward' ? <ArrowRight size={18} aria-hidden="true" /> : null}
    </Link>
  );
}

export const FULL_PAGE_MESSAGE_SHELL_CLASS =
  'w-full min-h-screen bg-surface-page flex flex-col items-center justify-center px-6 py-16 text-center';

type DeadEndHeadingLevel = 'h1' | 'h2';

export function DeadEndContent({
  icon: Icon,
  eyebrow,
  title,
  headingLevel: Heading = 'h1',
  description,
  detail,
  children,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  headingLevel?: DeadEndHeadingLevel;
  description: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div
        className="w-20 h-20 bg-surface-subtle text-muted-foreground rounded-full flex items-center justify-center mb-6"
        data-parity="dead-end-icon"
      >
        <Icon size={36} aria-hidden="true" />
      </div>
      {eyebrow ? <SectionEyebrow variant="muted">{eyebrow}</SectionEyebrow> : null}
      <Heading className="font-serif text-display-md text-text-primary tracking-tight">
        {title}
      </Heading>
      <p className="mt-4 max-w-md text-lg text-text-secondary leading-relaxed">
        {description}
      </p>
      {detail ? (
        <p
          className="mt-3 max-w-md text-base text-text-secondary leading-relaxed"
          data-parity="dead-end-detail"
        >
          {detail}
        </p>
      ) : null}
      {children ? <div className="mt-8 flex justify-center">{children}</div> : null}
    </>
  );
}

type DeadEndAnnouncement = 'alert' | 'none';

const ANNOUNCEMENT_ROLE: Record<DeadEndAnnouncement, 'alert' | undefined> = {
  alert: 'alert',
  none: undefined,
};

export function DeadEndPanel({
  icon,
  title,
  headingLevel = 'h1',
  description,
  action,
  announcement = 'alert',
}: {
  icon: LucideIcon;
  title: string;
  headingLevel?: DeadEndHeadingLevel;
  description: ReactNode;
  action?: ReactNode;
  announcement?: DeadEndAnnouncement;
}) {
  return (
    <div
      role={ANNOUNCEMENT_ROLE[announcement]}
      className="bg-surface-base rounded-panel shadow-soft border border-border-default/50 flex flex-col items-center px-6 py-16 text-center"
    >
      <DeadEndContent icon={icon} title={title} headingLevel={headingLevel} description={description}>
        {action}
      </DeadEndContent>
    </div>
  );
}

export function ErrorPage({
  icon,
  eyebrow,
  title,
  description,
  detail,
  children,
  landmarkLabel = 'Error',
  parityRoot,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
  landmarkLabel?: string;
  parityRoot?: string;
}) {
  return (
    <main
      aria-label={landmarkLabel}
      className={FULL_PAGE_MESSAGE_SHELL_CLASS}
      data-parity-root={parityRoot}
    >
      <DeadEndContent
        icon={icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        detail={detail}
      >
        {children}
      </DeadEndContent>
    </main>
  );
}
