import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { cardVariants } from "../primitives/card";
import { VALUE_LG_CLASS, WIDGET_TITLE_CLASS } from "../lib/typography";

type WidgetDensity = "default" | "compact";

type PortalWidgetProps = {
  title: ReactNode;
  icon?: ReactNode;
  titleAdornment?: ReactNode;
  hero?: ReactNode;
  heroUnit?: ReactNode;
  density?: WidgetDensity;
  context?: ReactNode;
  voice?: ReactNode;
  headingId: string;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
};

const PANEL_CLASS: Record<WidgetDensity, string> = {
  default: cn(cardVariants({ variant: "portal-panel" }), "flex flex-col p-6"),
  compact:
    "flex flex-col rounded-card border border-border-default/50 bg-surface-base p-4",
};

const HEADER_CLASS: Record<WidgetDensity, string> = {
  default: "mb-4",
  compact: "mb-2",
};

const TITLE_CLASS: Record<WidgetDensity, string> = {
  default: WIDGET_TITLE_CLASS,
  compact: "text-sm font-semibold text-text-primary",
};

const HERO_CLASS: Record<WidgetDensity, string> = {
  default: VALUE_LG_CLASS,
  compact: "text-sm font-medium text-text-primary",
};

const FOOTER_CLASS: Record<WidgetDensity, string> = {
  default: "mt-auto pt-6",
  compact: "mt-auto pt-3",
};

const VOICE_CLASS = "font-heading text-2xl tracking-tight text-text-primary";

export function PortalWidget({
  title,
  icon,
  titleAdornment,
  hero,
  heroUnit,
  density = "default",
  context,
  voice,
  headingId,
  action,
  footer,
  className,
  children,
}: PortalWidgetProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(PANEL_CLASS[density], className)}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4",
          HEADER_CLASS[density],
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h2
            id={headingId}
            className={cn("flex items-center gap-2", TITLE_CLASS[density])}
          >
            {icon}
            {title}
          </h2>
          {titleAdornment}
        </div>
        {action && (
          <div className="-my-2 flex shrink-0 items-center">{action}</div>
        )}
      </div>

      {voice && <p className={VOICE_CLASS}>{voice}</p>}

      {hero && (
        <p className={HERO_CLASS[density]}>
          {hero}
          {heroUnit && (
            <span className="ml-1 text-sm font-medium tracking-normal text-text-secondary">
              {heroUnit}
            </span>
          )}
        </p>
      )}

      {context && <p className="mt-1 text-sm text-text-secondary">{context}</p>}

      {children}

      {footer && <div className={FOOTER_CLASS[density]}>{footer}</div>}
    </section>
  );
}
