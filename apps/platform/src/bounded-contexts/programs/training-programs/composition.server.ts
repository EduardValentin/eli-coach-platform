import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import {
  ReadProgramCardUseCase,
  ReadProgramSetupUseCase,
  StartProgramUseCase,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import type { ClockPort } from "~/bounded-contexts/programs/training-programs/domain/clock-port";
import type { CardioExercisesFacade } from "~/bounded-contexts/programs/exercise-library/public/cardio-exercises-facade";
import type { ClientCoachingFacade } from "~/bounded-contexts/clients/public/client-coaching-facade";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

import { CoachProgramController } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/coach/coach-program-controller.server";
import type { TrainingProgramsFeature } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";
import { ClientsClientCoachingAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/clients/clients-client-coaching-adapter.server";
import { ExerciseLibraryCardioExercisesAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/exercise-library/exercise-library-cardio-exercises-adapter.server";
import { ProgramIncidentsAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/logging/program-incidents-adapter.server";
import { PostgresProgramStoreRepository } from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/programs/postgres-program-store-repository.server";
import { RandomProgramIdsAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/programs/random-program-ids-adapter.server";

type TrainingProgramsFeatureHandles = {
  cardioExercisesFacade: CardioExercisesFacade;
  clientCoachingFacade: ClientCoachingFacade;
  clockPort: ClockPort;
  database: DatabaseClient;
  loggerPort: LoggerPort;
};

export function composeTrainingProgramsFeature(
  handles: TrainingProgramsFeatureHandles,
): TrainingProgramsFeature {
  const postgresProgramStoreRepository = new PostgresProgramStoreRepository(
    handles.database,
  );
  const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
    handles.clientCoachingFacade,
  );
  const programIncidentsAdapter = new ProgramIncidentsAdapter(
    handles.loggerPort,
  );
  const programReads = {
    clientCoachingPort: clientsClientCoachingAdapter,
    programStorePort: postgresProgramStoreRepository,
  };

  return {
    coachProgramController: new CoachProgramController({
      readProgramCardUseCase: new ReadProgramCardUseCase(programReads),
      readProgramSetupUseCase: new ReadProgramSetupUseCase(programReads),
      startProgramUseCase: new StartProgramUseCase({
        ...programReads,
        cardioExercisesPort: new ExerciseLibraryCardioExercisesAdapter(
          handles.cardioExercisesFacade,
        ),
        programIdsPort: new RandomProgramIdsAdapter(),
        clockPort: handles.clockPort,
        programIncidentsPort: programIncidentsAdapter,
      }),
      unitOfWork: createUnitOfWork(handles.database),
      programIncidentsPort: programIncidentsAdapter,
    }),
  };
}
