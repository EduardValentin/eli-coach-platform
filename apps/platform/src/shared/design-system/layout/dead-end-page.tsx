import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { buttonVariants, cardVariants, SectionEyebrow } from "../primitives";

const DEAD_END_BODY_CLASS_NAME =
  "flex flex-col items-center px-6 py-16 text-center";

type DeadEndContentProps = {
  children?: ReactNode;
  description: ReactNode;
  detail?: ReactNode;
  eyebrow?: string;
  icon: ReactNode;
  title: string;
};

type DeadEndPageProps = DataAttributes &
  DeadEndContentProps & {
    landmarkLabel: string;
  };

function DeadEndContent(props: DeadEndContentProps) {
  const { children, description, detail, eyebrow, icon, title } = props;

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
      {detail ? (
        <p
          className="mt-3 max-w-md text-base leading-relaxed text-text-secondary"
          data-parity="dead-end-detail"
        >
          {detail}
        </p>
      ) : null}
      {children ? (
        <div className="mt-8 flex justify-center">{children}</div>
      ) : null}
    </>
  );
}

export function DeadEndPage({
  children,
  description,
  detail,
  eyebrow,
  icon,
  landmarkLabel,
  title,
  ...dataAttributes
}: DeadEndPageProps) {
  return (
    <main
      {...dataAttributes}
      aria-label={landmarkLabel}
      className={cn(
        DEAD_END_BODY_CLASS_NAME,
        "min-h-screen w-full justify-center bg-surface-page",
      )}
    >
      <DeadEndContent
        description={description}
        detail={detail}
        eyebrow={eyebrow}
        icon={icon}
        title={title}
      >
        {children}
      </DeadEndContent>
    </main>
  );
}

type DeadEndLinkProps = Omit<LinkProps, "className"> & {
  className?: string;
  direction: "back" | "forward";
};

export function DeadEndLink({
  children,
  className,
  direction,
  ...props
}: DeadEndLinkProps) {
  return (
    <Link
      className={cn(
        buttonVariants({ size: "lg", variant: "inverted" }),
        className,
      )}
      {...props}
    >
      {direction === "back" ? <ArrowLeft aria-hidden="true" size={18} /> : null}
      {children}
      {direction === "forward" ? (
        <ArrowRight aria-hidden="true" size={18} />
      ) : null}
    </Link>
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
