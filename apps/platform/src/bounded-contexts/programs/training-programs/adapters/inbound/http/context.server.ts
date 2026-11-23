import { createContext, type RouterContext } from "react-router";

import type { CoachProgramController } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/coach/coach-program-controller.server";

export type TrainingProgramsFeature = {
  coachProgramController: CoachProgramController;
};

export const trainingProgramsContext: RouterContext<TrainingProgramsFeature> =
  createContext<TrainingProgramsFeature>();
