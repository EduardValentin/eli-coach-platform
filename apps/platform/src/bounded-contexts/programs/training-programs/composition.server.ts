import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import {
  ReadProgramCardUseCase,
  ReadProgramDraftUseCase,
  ReadProgramSetupUseCase,
  SaveProgramDraftUseCase,
  StartProgramUseCase,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import type { ClockPort } from "~/bounded-contexts/programs/training-programs/domain/clock-port";
import type { ExerciseUsageFacade } from "~/bounded-contexts/programs/exercise-library/public/exercise-usage-facade";
import type { LibraryExercisesFacade } from "~/bounded-contexts/programs/exercise-library/public/library-exercises-facade";
import type { ClientCoachingFacade } from "~/bounded-contexts/clients/public/client-coaching-facade";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";
import type { CoachingEndedFacade } from "~/bounded-contexts/sales/public/coaching-ended-facade";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

import { CoachProgramController } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/coach/coach-program-controller.server";
import type { TrainingProgramsFeature } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";
import { ClientsClientCoachingAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/clients/clients-client-coaching-adapter.server";
import { ClientsClientIdentityAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/clients/clients-client-identity-adapter.server";
import { ExerciseLibraryExerciseUsageAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/exercise-library/exercise-library-exercise-usage-adapter.server";
import { ExerciseLibraryLibraryExercisesAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/exercise-library/exercise-library-library-exercises-adapter.server";
import { ProgramIncidentsAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/logging/program-incidents-adapter.server";
import { SalesCoachingEndedAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/sales/sales-coaching-ended-adapter.server";
import { PostgresProgramStoreRepository } from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/programs/postgres-program-store-repository.server";
import { RandomProgramIdsAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/programs/random-program-ids-adapter.server";

type TrainingProgramsFeatureHandles = {
  libraryExercisesFacade: LibraryExercisesFacade;
  exerciseUsageFacade: ExerciseUsageFacade;
  clientCoachingFacade: ClientCoachingFacade;
  clientLookupFacade: Pick<ClientLookupFacade, "identityOf">;
  clockPort: ClockPort;
  coachingEndedFacade: CoachingEndedFacade;
  database: DatabaseClient;
  loggerPort: LoggerPort;
};

export function composeTrainingProgramsFeature(
  handles: TrainingProgramsFeatureHandles,
): TrainingProgramsFeature {
  const postgresProgramStoreRepository = new PostgresProgramStoreRepository(
    handles.database,
  );
  const exerciseLibrary = {
    libraryExercisesPort: new ExerciseLibraryLibraryExercisesAdapter(
      handles.libraryExercisesFacade,
    ),
    exerciseUsagePort: new ExerciseLibraryExerciseUsageAdapter(
      handles.exerciseUsageFacade,
    ),
  };
  const programReads = {
    clientIdentityPort: new ClientsClientIdentityAdapter(
      handles.clientLookupFacade,
    ),
    coachingEndedPort: new SalesCoachingEndedAdapter(
      handles.coachingEndedFacade,
    ),
    clientCoachingPort: new ClientsClientCoachingAdapter(
      handles.clientCoachingFacade,
    ),
    programStorePort: postgresProgramStoreRepository,
  };

  return {
    coachProgramController: new CoachProgramController({
      readProgramCardUseCase: new ReadProgramCardUseCase(programReads),
      readProgramSetupUseCase: new ReadProgramSetupUseCase(programReads),
      startProgramUseCase: new StartProgramUseCase({
        ...programReads,
        ...exerciseLibrary,
        programIdsPort: new RandomProgramIdsAdapter(),
        clockPort: handles.clockPort,
      }),
      readProgramDraftUseCase: new ReadProgramDraftUseCase({
        ...programReads,
        libraryExercisesPort: exerciseLibrary.libraryExercisesPort,
      }),
      saveProgramDraftUseCase: new SaveProgramDraftUseCase({
        ...programReads,
        ...exerciseLibrary,
        clockPort: handles.clockPort,
      }),
      unitOfWork: createUnitOfWork(handles.database),
      programIncidentsPort: new ProgramIncidentsAdapter(handles.loggerPort),
    }),
  };
}
