import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { cn } from './ui/utils';
import { PortalWidgetPanel } from './PortalWidget';
import { WIDGET_TITLE_CLASS } from './typography';

interface CollapsiblePortalWidgetProps {
  title: ReactNode;
  icon?: ReactNode;
  headingId: string;
  className?: string;
  parityRoot?: string;
  children: ReactNode;
}

export function CollapsiblePortalWidget({
  title,
  icon,
  headingId,
  className,
  parityRoot,
  children,
}: CollapsiblePortalWidgetProps) {
  return (
    <PortalWidgetPanel
      headingId={headingId}
      className={className}
      parityRoot={parityRoot}
    >
      <Accordion type="single" collapsible>
        <AccordionItem value={headingId}>
          <AccordionTrigger
            headingTag="h2"
            headingId={headingId}
            layout="title"
          >
            <span className={cn('flex items-center gap-2', WIDGET_TITLE_CLASS)}>
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
