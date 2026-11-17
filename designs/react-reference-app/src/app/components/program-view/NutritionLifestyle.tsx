import { Leaf } from 'lucide-react';
import { SettingsBody, SettingsSection } from '../SettingsSection';
import { WIDGET_TITLE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import type { PlacedTexts, TextPart } from './programTextPlacement';
import { TextParts } from './TextDisclosure';

type Topic = { id: string; title: string; parts: TextPart[] };

export function NutritionLifestyle({ texts }: { texts: Pick<PlacedTexts, 'nutrition' | 'lifestyle'> }) {
  const topics: Topic[] = [
    { id: 'nutrition', title: 'Nutrition', parts: texts.nutrition },
    { id: 'lifestyle', title: 'Lifestyle', parts: texts.lifestyle },
  ].filter(topic => topic.parts.length > 0);
  if (topics.length === 0) return null;

  if (topics.length === 1) {
    const [topic] = topics;
    return (
      <SettingsSection headingId="program-nutrition-lifestyle" title={topic.title} icon={Leaf}>
        <SettingsBody>
          <TextParts parts={topic.parts} headingLevel="h3" />
        </SettingsBody>
      </SettingsSection>
    );
  }
  return (
    <SettingsSection headingId="program-nutrition-lifestyle" title="Nutrition and lifestyle" icon={Leaf}>
      <Accordion type="single" collapsible>
        {topics.map(topic => (
          <AccordionItem key={topic.id} value={topic.id} data-parity="text-topic">
            <AccordionTrigger layout="title" className={cn(WIDGET_TITLE_CLASS, 'min-h-14 px-5 hover:bg-surface-subtle sm:px-6')}>
              {topic.title}
            </AccordionTrigger>
            <AccordionContent className="px-5 pt-1 pb-5 sm:px-6">
              <TextParts parts={topic.parts} headingLevel="h4" />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SettingsSection>
  );
}
