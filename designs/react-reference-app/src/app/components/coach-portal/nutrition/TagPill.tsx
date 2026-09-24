import type { Tag } from '../../../context/NutritionContext';
import { Badge } from '../../ui/badge';
import { TAG_FAMILY_ICON } from './food-icons';
import { TAG_FAMILY_PILL } from './nutrition-constants';

// Canonical tag chip — used everywhere a tag is displayed (coach + client) so the
// per-family color scheme (mealtime / cycle / nutrient / dietary) stays consistent
// across the whole nutrition module.
export function TagPill({ tag }: { tag: Tag }) {
  const Icon = TAG_FAMILY_ICON[tag.family];
  return (
    <Badge className={`text-text-primary ${TAG_FAMILY_PILL[tag.family]}`}>
      <Icon size={11} className="text-text-secondary" aria-hidden="true" />
      {tag.label}
    </Badge>
  );
}
