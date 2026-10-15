import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { WIDGET_TITLE_CLASS } from "../lib/typography";
import { cardVariants } from "../primitives/card";
import { Label, RequiredMark } from "../primitives/label";
import { PanelTitleIcon } from "./panel-title-icon";

type SettingsSectionProps = DataAttributes & {
  headingId: string;
  headingRef?: Ref<HTMLHeadingElement>;
  title: ReactNode;
  icon?: LucideIcon;
  description?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SettingsSection({
  headingId,
  headingRef,
  title,
  icon,
  description,
  footer,
  className,
  children,
  ...dataAttributes
}: SettingsSectionProps) {
  return (
    <section
      {...dataAttributes}
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
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className={cn(
            "flex items-center gap-2 focus:outline-none",
            WIDGET_TITLE_CLASS,
          )}
        >
          {icon && <PanelTitleIcon icon={icon} />}
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

type SettingsRowContainer = "div" | "fieldset";
type SettingsRowLayout = "inline" | "stacked";

type SettingsRowProps = Omit<
  HTMLAttributes<HTMLElement>,
  "title" | "className" | "children"
> & {
  as?: SettingsRowContainer;
  labelId?: string;
  htmlFor?: string;
  descriptionId?: string;
  title: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  problem?: ReactNode;
  layout?: SettingsRowLayout;
  required?: boolean;
  children?: ReactNode;
};

type SettingsRowTitleProps = Pick<
  SettingsRowProps,
  "labelId" | "htmlFor" | "required" | "title"
>;

const ROW_TITLE_CLASS = "text-sm font-medium text-text-primary";

function SettingsRowTitle({
  labelId,
  htmlFor,
  required,
  title,
}: SettingsRowTitleProps) {
  if (htmlFor) {
    return (
      <Label htmlFor={htmlFor} id={labelId} required={required}>
        {title}
      </Label>
    );
  }

  return (
    <p id={labelId} className={ROW_TITLE_CLASS}>
      {title}
      {required && <RequiredMark />}
    </p>
  );
}

export function SettingsRow({
  as = "div",
  labelId,
  htmlFor,
  descriptionId,
  title,
  description,
  hint,
  problem,
  layout = "inline",
  required,
  children,
  ...rest
}: SettingsRowProps) {
  const Container = as;

  return (
    <Container
      aria-labelledby={as === "fieldset" ? labelId : undefined}
      className={cn("px-5 py-5 sm:px-6", {
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6":
          layout === "inline",
      })}
      {...rest}
    >
      <div
        className={cn({
          "flex min-w-0 flex-1 items-start gap-3": layout === "inline",
        })}
      >
        <div className="min-w-0">
          <SettingsRowTitle
            htmlFor={htmlFor}
            labelId={labelId}
            required={required}
            title={title}
          />
          {description && (
            <p
              id={descriptionId}
              className="mt-0.5 text-xs text-text-secondary"
            >
              {description}
            </p>
          )}
          {hint && (
            <p className="mt-1 text-xs tabular-nums text-text-secondary">
              {hint}
            </p>
          )}
          {problem && <div className="mt-1">{problem}</div>}
        </div>
      </div>
      {children && (
        <div
          className={cn({
            "shrink-0": layout === "inline",
            "mt-3 w-full": layout === "stacked",
          })}
        >
          {children}
        </div>
      )}
    </Container>
  );
}
