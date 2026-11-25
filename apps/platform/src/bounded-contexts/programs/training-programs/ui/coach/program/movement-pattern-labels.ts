import type { MovementPattern } from "~/bounded-contexts/programs/training-programs/public/program-editing";

export const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: "Squat",
  lunge: "Lunge",
  hinge: "Hinge",
  "horizontal-push": "Horizontal push",
  "vertical-push": "Vertical push",
  "horizontal-pull": "Horizontal pull",
  "vertical-pull": "Vertical pull",
  core: "Core",
  carry: "Carry",
  isolation: "Isolation",
  conditioning: "Conditioning",
};
