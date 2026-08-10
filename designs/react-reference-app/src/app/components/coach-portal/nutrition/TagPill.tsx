import type { Tag } from '../../../context/NutritionContext';
import { TAG_FAMILY_ICON } from './food-icons';
import { TAG_FAMILY_PILL } from './nutrition-constants';

// Canonical tag chip — used everywhere a tag is displayed (coach + client) so the
// per-family color scheme (slate meal-time / purple cycle / green nutrient / cyan dietary)
// stays consistent across the whole nutrition module.
export function TagPill({ tag }: { tag: Tag }) {
  const Icon = TAG_FAMILY_ICON[tag.family];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground ${TAG_FAMILY_PILL[tag.family]}`}>
      <Icon size={11} className="text-muted-foreground" aria-hidden="true" />
      {tag.label}
    </span>
  );
}
