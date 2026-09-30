import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { WIDGET_TITLE_CLASS } from "../lib/typography";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../primitives/accordion";
import { PortalWidgetPanel } from "./portal-widget";

type CollapsiblePortalWidgetProps = DataAttributes & {
  title: ReactNode;
  icon?: ReactNode;
  headingId: string;
  className?: string;
  children: ReactNode;
};

export function CollapsiblePortalWidget({
  title,
  icon,
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
        <AccordionItem value={headingId}>
          <AccordionTrigger
            className="items-center py-0 [&>svg]:translate-y-0"
            headingId={headingId}
            headingTag="h2"
          >
            <span className={cn("flex items-center gap-2", WIDGET_TITLE_CLASS)}>
              {icon}
              {title}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-0">{children}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </PortalWidgetPanel>
  );
}
