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
import type { CardioExercisesFacade } from "~/bounded-contexts/programs/exercise-library/public/cardio-exercises-facade";
import type { ClientCoachingFacade } from "~/bounded-contexts/clients/public/client-coaching-facade";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";
import type { CoachingEndedFacade } from "~/bounded-contexts/sales/public/coaching-ended-facade";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

import { CoachProgramController } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/coach/coach-program-controller.server";
import type { TrainingProgramsFeature } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";
import { ClientsClientCoachingAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/clients/clients-client-coaching-adapter.server";
import { ClientsClientIdentityAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/clients/clients-client-identity-adapter.server";
import { ExerciseLibraryCardioExercisesAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/exercise-library/exercise-library-cardio-exercises-adapter.server";
import { ProgramIncidentsAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/logging/program-incidents-adapter.server";
import { SalesCoachingEndedAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/sales/sales-coaching-ended-adapter.server";
import { PostgresProgramStoreRepository } from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/programs/postgres-program-store-repository.server";
import { RandomProgramIdsAdapter } from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/programs/random-program-ids-adapter.server";

type TrainingProgramsFeatureHandles = {
  cardioExercisesFacade: CardioExercisesFacade;
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
        cardioExercisesPort: new ExerciseLibraryCardioExercisesAdapter(
          handles.cardioExercisesFacade,
        ),
        programIdsPort: new RandomProgramIdsAdapter(),
        clockPort: handles.clockPort,
      }),
      readProgramDraftUseCase: new ReadProgramDraftUseCase(programReads),
      saveProgramDraftUseCase: new SaveProgramDraftUseCase({
        ...programReads,
        clockPort: handles.clockPort,
      }),
      unitOfWork: createUnitOfWork(handles.database),
      programIncidentsPort: new ProgramIncidentsAdapter(handles.loggerPort),
    }),
  };
}
