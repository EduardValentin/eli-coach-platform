import { FileText } from "lucide-react";
import type { MetaFunction } from "react-router";

import { TrainingEmptyState } from "~/surfaces/coach-portal/sections/training-empty-state";

export const meta: MetaFunction = () => [{ title: "Templates | Evoa" }];

export default function TrainingTemplatesRoute() {
  return (
    <TrainingEmptyState
      icon={<FileText size={32} />}
      message="No templates yet. Create one to get started."
    />
  );
}
