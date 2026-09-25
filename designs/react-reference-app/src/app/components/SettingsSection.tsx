import type { ElementType, ReactNode } from "react";
import { cardVariants } from "./ui/card";
import { Label } from "./ui/label";
import { cn } from "./ui/utils";
import { WIDGET_TITLE_CLASS } from "./typography";

export function SettingsSection({
  headingId,
  title,
  icon,
  description,
  footer,
  className,
  children,
}: {
  headingId: string;
  title: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        cardVariants({ variant: "panel" }),
        "overflow-hidden",
        className,
      )}
    >
      <div className="border-b border-border-subtle px-5 py-4 sm:px-6">
        <h2
          id={headingId}
          className={cn("flex items-center gap-2", WIDGET_TITLE_CLASS)}
        >
          {icon}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>

      {children}

      {footer && (
        <div className="flex justify-end gap-3 border-t border-border-subtle px-5 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </section>
  );
}

export function SettingsRows({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border-subtle">{children}</div>;
}

type SettingsRowLayout = "inline" | "stacked";

export function SettingsRow({
  as = "div",
  labelId,
  htmlFor,
  descriptionId,
  title,
  description,
  hint,
  layout = "inline",
  children,
  ...rest
}: {
  as?: ElementType;
  labelId?: string;
  htmlFor?: string;
  descriptionId?: string;
  title: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  layout?: SettingsRowLayout;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const Container = as;

  const titleNode = htmlFor ? (
    <Label htmlFor={htmlFor} id={labelId}>
      {title}
    </Label>
  ) : (
    <p id={labelId} className="text-sm font-medium text-text-primary">
      {title}
    </p>
  );

  const textBlock = (
    <div
      className={cn(
        layout === "inline" && "flex flex-1 items-start gap-3 min-w-0",
      )}
    >
      <div className="min-w-0">
        {titleNode}
        {description && (
          <p id={descriptionId} className="mt-0.5 text-xs text-text-secondary">
            {description}
          </p>
        )}
        {hint && (
          <p className="mt-1 text-xs tabular-nums text-text-secondary">
            {hint}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Container
      aria-labelledby={as === "fieldset" ? labelId : undefined}
      className={cn(
        "px-5 py-5 sm:px-6",
        layout === "inline" &&
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6",
      )}
      {...rest}
    >
      {textBlock}
      {children && (
        <div className={cn(layout === "inline" ? "shrink-0" : "mt-3 w-full")}>
          {children}
        </div>
      )}
    </Container>
  );
}
