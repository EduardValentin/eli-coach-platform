import { SectionEyebrow } from "@eli-coach-platform/ui";
import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router";

type RootErrorPageProps = {
  description: string;
  heading: string;
  statusLabel: string;
};

// The root error boundary replaces the whole route tree, so this page cannot
// reuse the public site's shell: that shell is a surface — which `root.tsx` may
// not import — and it needs loader data an unmatched URL never produces. It
// carries the public site's visual language directly instead, following the
// dead-end composition `/store/download` already uses for an expired link.
export function RootErrorPage(props: RootErrorPageProps) {
  const { description, heading, statusLabel } = props;

  return (
    <main
      aria-label="Error"
      className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-6 py-16 text-center"
    >
      <span className="mb-6 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-text-muted">
        <Compass aria-hidden="true" size={36} />
      </span>
      <SectionEyebrow variant="muted">{statusLabel}</SectionEyebrow>
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        {heading}
      </h1>
      <p className="mt-4 max-w-md text-body-lg text-text-secondary">
        {description}
      </p>
      <Link
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-pill bg-surface-inverted px-7 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary"
        to="/"
      >
        Back to home
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </main>
  );
}
