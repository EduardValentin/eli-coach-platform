import type { Tag } from '../../../context/NutritionContext';
import { Badge } from '../../ui/badge';
import { TAG_FAMILY_ICON } from './food-icons';
import { TAG_FAMILY_TONE } from './nutrition-constants';

// Canonical tag chip — used everywhere a tag is displayed (coach + client) so the
// per-family color scheme (mealtime / cycle / nutrient / dietary) stays consistent
// across the whole nutrition module.
export function TagPill({ tag }: { tag: Tag }) {
  const Icon = TAG_FAMILY_ICON[tag.family];
  return (
    <Badge tone={TAG_FAMILY_TONE[tag.family]} data-parity-root="TagPill">
      <Icon size={11} aria-hidden="true" />
      {tag.label}
    </Badge>
  );
}
