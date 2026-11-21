import { relative } from "@react-router/dev/routes";

import { PROGRAM_SETUP_ROUTE_SEGMENT } from "./public/paths";

const { route } = relative(import.meta.dirname);

export const trainingProgramsCoachSetupRoutes = [
  route(
    PROGRAM_SETUP_ROUTE_SEGMENT,
    "./ui/coach/program/program-setup-page.tsx",
  ),
];
