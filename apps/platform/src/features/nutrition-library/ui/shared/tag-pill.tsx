import { Badge } from "@eli-coach-platform/ui/primitives";
import { Clock, Leaf, Moon, Sparkles, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import type { NutritionTagView } from "~/features/nutrition-library/public/foods";

type TagFamilyAppearance = {
  tone: NonNullable<ComponentProps<typeof Badge>["tone"]>;
  icon: LucideIcon;
};

export const TAG_FAMILY_APPEARANCE: Readonly<
  Record<NutritionTagView["family"], TagFamilyAppearance>
> = {
  "meal-time": { tone: "tint-slate", icon: Clock },
  "cycle-phase": { tone: "tint-violet", icon: Moon },
  nutrient: { tone: "tint-lime", icon: Sparkles },
  dietary: { tone: "tint-cyan", icon: Leaf },
};

export const TAG_FAMILY_LABELS: Readonly<
  Record<NutritionTagView["family"], string>
> = {
  "meal-time": "Meal-time",
  "cycle-phase": "Cycle phase",
  nutrient: "Nutrient / benefit",
  dietary: "Dietary",
};

export function TagPill({ tag }: { tag: NutritionTagView }) {
  const { tone, icon: Icon } = TAG_FAMILY_APPEARANCE[tag.family];

  return (
    <Badge data-parity-root="TagPill" tone={tone}>
      <Icon aria-hidden="true" />
      {tag.label}
    </Badge>
  );
}
