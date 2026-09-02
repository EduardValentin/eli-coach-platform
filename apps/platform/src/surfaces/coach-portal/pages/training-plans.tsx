import { Users } from "lucide-react";
import type { MetaFunction } from "react-router";

import { TrainingEmptyState } from "~/surfaces/coach-portal/sections/training-empty-state";

export const meta: MetaFunction = () => [{ title: "Client Plans | Evoa" }];

export default function TrainingPlansRoute() {
  return (
    <TrainingEmptyState
      icon={<Users size={32} />}
      message="No client plans yet. Start one from a template or create from scratch."
    />
  );
}
