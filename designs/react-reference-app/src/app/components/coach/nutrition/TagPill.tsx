import type { Tag } from '../../../context/NutritionContext';
import { TAG_FAMILY_ICON } from './food-icons';

export function TagPill({ tag }: { tag: Tag }) {
  const Icon = TAG_FAMILY_ICON[tag.family];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
      <Icon size={11} className="text-muted-foreground" aria-hidden="true" />
      {tag.label}
    </span>
  );
}
