import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { cardVariants, SectionEyebrow } from "../primitives";

const DEAD_END_BODY_CLASS_NAME =
  "flex flex-col items-center px-6 py-16 text-center";

type DeadEndContentProps = {
  children?: ReactNode;
  description: ReactNode;
  eyebrow?: string;
  icon: ReactNode;
  title: string;
};

type DeadEndPageProps = {
  children: ReactNode;
  description: ReactNode;
  eyebrow: string;
  icon: ReactNode;
  landmarkLabel: string;
  title: string;
};

function DeadEndContent(props: DeadEndContentProps) {
  const { children, description, eyebrow, icon, title } = props;

  return (
    <>
      <div
        className="mb-6 flex size-20 items-center justify-center rounded-full bg-surface-subtle text-text-muted"
        data-parity="dead-end-icon"
      >
        {icon}
      </div>
      {eyebrow ? (
        <SectionEyebrow variant="muted">{eyebrow}</SectionEyebrow>
      ) : null}
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-text-secondary">
        {description}
      </p>
      {children ? (
        <div className="mt-8 flex justify-center">{children}</div>
      ) : null}
    </>
  );
}

export function DeadEndPage(props: DeadEndPageProps) {
  const { children, description, eyebrow, icon, landmarkLabel, title } = props;

  return (
    <main
      aria-label={landmarkLabel}
      className={cn(
        DEAD_END_BODY_CLASS_NAME,
        "min-h-screen w-full justify-center bg-surface-page",
      )}
    >
      <DeadEndContent
        description={description}
        eyebrow={eyebrow}
        icon={icon}
        title={title}
      >
        {children}
      </DeadEndContent>
    </main>
  );
}

type DeadEndPanelProps = DataAttributes & {
  action?: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  title: string;
};

export function DeadEndPanel({
  action,
  description,
  icon,
  title,
  ...dataAttributes
}: DeadEndPanelProps) {
  return (
    <div
      {...dataAttributes}
      className={cn(
        cardVariants({ variant: "portal-panel" }),
        DEAD_END_BODY_CLASS_NAME,
      )}
      role="alert"
    >
      <DeadEndContent description={description} icon={icon} title={title}>
        {action}
      </DeadEndContent>
    </div>
  );
}
