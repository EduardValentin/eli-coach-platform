import { relative } from "@react-router/dev/routes";

import {
  PROGRAM_BUILDER_ROUTE_SEGMENT,
  PROGRAM_SETUP_ROUTE_SEGMENT,
  TRAINING_PROGRAMS_API_PATHS,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

export const trainingProgramsCoachRoutes = [
  route(
    PROGRAM_SETUP_ROUTE_SEGMENT,
    "./ui/coach/program/program-setup-page.tsx",
  ),
  route(
    PROGRAM_BUILDER_ROUTE_SEGMENT,
    "./ui/coach/program/program-builder-page.tsx",
  ),
];

export const trainingProgramsApiRoutes = [
  route(
    TRAINING_PROGRAMS_API_PATHS.programDraft.slice(1),
    "./adapters/inbound/http/coach/program-draft.ts",
  ),
];
