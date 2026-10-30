import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { WIDGET_TITLE_CLASS } from "../lib/typography";
import {
  Accordion,
  AccordionChevron,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../primitives/accordion";
import { PanelTitleIcon } from "./panel-title-icon";
import { PortalWidgetPanel } from "./portal-widget";

type CollapsiblePortalWidgetProps = DataAttributes & {
  title: ReactNode;
  icon?: LucideIcon;
  titleAdornment?: ReactNode;
  action?: ReactNode;
  headingId: string;
  className?: string;
  children: ReactNode;
};

export function CollapsiblePortalWidget({
  title,
  icon,
  titleAdornment,
  action,
  headingId,
  className,
  children,
  ...dataAttributes
}: CollapsiblePortalWidgetProps) {
  return (
    <PortalWidgetPanel
      {...dataAttributes}
      className={className}
      headingId={headingId}
    >
      <Accordion collapsible type="single">
        <AccordionItem className="group/collapsible" value={headingId}>
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <AccordionTrigger
                chevron="none"
                className="min-w-0 flex-initial after:absolute after:inset-0"
                headingId={headingId}
                headingTag="h2"
                layout="title"
              >
                <span
                  className={cn("flex items-center gap-2", WIDGET_TITLE_CLASS)}
                >
                  {icon && <PanelTitleIcon icon={icon} />}
                  {title}
                </span>
              </AccordionTrigger>
              {titleAdornment && (
                <div className="relative flex items-center">
                  {titleAdornment}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {action && (
                <div className="relative -my-2 flex items-center">{action}</div>
              )}
              <AccordionChevron className="group-data-[state=open]/collapsible:rotate-180" />
            </div>
          </div>
          <AccordionContent className="pt-4 pb-0">{children}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </PortalWidgetPanel>
  );
}
