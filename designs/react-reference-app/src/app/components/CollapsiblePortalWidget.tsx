import { ChevronDownIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { cn } from './ui/utils';
import { PortalWidgetPanel } from './PortalWidget';
import { PanelTitleIcon } from './PanelTitleIcon';
import { WIDGET_TITLE_CLASS } from './typography';

interface CollapsiblePortalWidgetProps {
  title: ReactNode;
  icon?: LucideIcon;
  titleAdornment?: ReactNode;
  action?: ReactNode;
  headingId: string;
  className?: string;
  parityRoot?: string;
  children: ReactNode;
}

export function CollapsiblePortalWidget({
  title,
  icon,
  titleAdornment,
  action,
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
        <AccordionItem value={headingId} className="group/collapsible">
          <div className="relative flex items-center gap-2">
            <AccordionTrigger
              headingTag="h2"
              headingId={headingId}
              layout="title"
              chevron="none"
              className="flex-none after:absolute after:inset-0"
            >
              <span className={cn('flex items-center gap-2', WIDGET_TITLE_CLASS)}>
                {icon && <PanelTitleIcon icon={icon} />}
                {title}
              </span>
            </AccordionTrigger>
            {titleAdornment && <div className="relative flex items-center">{titleAdornment}</div>}
            <div className="ml-auto flex shrink-0 items-center gap-4">
              {action && <div className="relative -my-2 flex items-center">{action}</div>}
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none size-4 shrink-0 text-text-secondary transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180"
              />
            </div>
          </div>
          <AccordionContent className="pt-4 pb-0">{children}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </PortalWidgetPanel>
  );
}
