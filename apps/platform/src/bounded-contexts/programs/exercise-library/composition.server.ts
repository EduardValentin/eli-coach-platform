import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import {
  ArchiveExerciseUseCase,
  CreateExerciseUseCase,
  DeleteExerciseUseCase,
  EditExerciseUseCase,
  ExerciseVideoCleanup,
  FindExerciseUseCase,
  ListExercisesUseCase,
  ListLibraryExercisesUseCase,
  OpenExerciseVideoUseCase,
  RecordExerciseUsageUseCase,
  RestoreExerciseUseCase,
  StageExerciseVideoUseCase,
  type ExerciseVideoFormatDetectorPort,
  type ExerciseVideoStorePort,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type { ClockPort } from "~/bounded-contexts/programs/exercise-library/domain/clock-port";

import { ExerciseLibraryController } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/coach/exercise-library-controller.server";
import { PostgresExerciseLibraryRepository } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercises/postgres-exercise-library-repository.server";
import { RandomExerciseIdsAdapter } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercises/random-exercise-ids-adapter.server";
import { RandomExerciseVideoIdsAdapter } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercises/random-exercise-video-ids-adapter.server";
import type { ExerciseLibraryFeature } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { ExerciseLibraryIncidentsAdapter } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/logging/exercise-library-incidents-adapter.server";
import { createExerciseVideoFormatDetectorAdapter } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/create-exercise-video-format-detector-adapter.server";
import { createExerciseVideoStoreAdapter } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/create-exercise-video-store-adapter.server";
import type { ExerciseVideosConfig } from "~/bounded-contexts/programs/exercise-library/config.server";
import { ExerciseUsageFacadeAdapter } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/facades/exercise-usage-facade-adapter.server";
import { LibraryExercisesFacadeAdapter } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/facades/library-exercises-facade-adapter.server";
import type { ExerciseUsageFacade } from "~/bounded-contexts/programs/exercise-library/public/exercise-usage-facade";
import type { LibraryExercisesFacade } from "~/bounded-contexts/programs/exercise-library/public/library-exercises-facade";

type ExerciseVideoFiles = {
  exerciseVideoFormatDetectorPort: ExerciseVideoFormatDetectorPort;
  exerciseVideoStorePort: ExerciseVideoStorePort;
};

type ExerciseLibraryFacadesComposition = {
  handles: {
    libraryExercisesFacade: LibraryExercisesFacade;
    exerciseUsageFacade: ExerciseUsageFacade;
  };
};

type ExerciseLibraryFeatureHandles = ExerciseVideoFiles & {
  clockPort: ClockPort;
  database: DatabaseClient;
  loggerPort: LoggerPort;
};

export function composeExerciseLibraryFeature(
  handles: ExerciseLibraryFeatureHandles,
): ExerciseLibraryFeature {
  const exerciseLibraryIncidentsAdapter = new ExerciseLibraryIncidentsAdapter(
    handles.loggerPort,
  );
  const postgresExerciseLibraryRepository =
    new PostgresExerciseLibraryRepository(handles.database);
  const { exerciseVideoStorePort } = handles;
  const exerciseWriteDependencies = {
    exerciseLibraryPort: postgresExerciseLibraryRepository,
    clockPort: handles.clockPort,
    exerciseLibraryIncidentsPort: exerciseLibraryIncidentsAdapter,
    exerciseVideoFormatDetectorPort: handles.exerciseVideoFormatDetectorPort,
    exerciseVideoIdsPort: new RandomExerciseVideoIdsAdapter(),
    exerciseVideoStorePort,
  };

  return {
    exerciseLibraryController: new ExerciseLibraryController({
      listExercisesUseCase: new ListExercisesUseCase({
        exerciseLibraryPort: postgresExerciseLibraryRepository,
      }),
      findExerciseUseCase: new FindExerciseUseCase({
        exerciseLibraryPort: postgresExerciseLibraryRepository,
      }),
      createExerciseUseCase: new CreateExerciseUseCase({
        ...exerciseWriteDependencies,
        exerciseIdsPort: new RandomExerciseIdsAdapter(),
      }),
      editExerciseUseCase: new EditExerciseUseCase(exerciseWriteDependencies),
      stageExerciseVideoUseCase: new StageExerciseVideoUseCase({
        exerciseVideoStorePort,
      }),
      openExerciseVideoUseCase: new OpenExerciseVideoUseCase({
        exerciseLibraryPort: postgresExerciseLibraryRepository,
        exerciseVideoStorePort,
      }),
      archiveExerciseUseCase: new ArchiveExerciseUseCase({
        exerciseLibraryPort: postgresExerciseLibraryRepository,
        clockPort: handles.clockPort,
      }),
      restoreExerciseUseCase: new RestoreExerciseUseCase({
        exerciseLibraryPort: postgresExerciseLibraryRepository,
        clockPort: handles.clockPort,
        exerciseLibraryIncidentsPort: exerciseLibraryIncidentsAdapter,
      }),
      deleteExerciseUseCase: new DeleteExerciseUseCase({
        exerciseLibraryPort: postgresExerciseLibraryRepository,
        videos: new ExerciseVideoCleanup({
          exerciseVideoStorePort,
          exerciseLibraryIncidentsPort: exerciseLibraryIncidentsAdapter,
        }),
      }),
    }),
  };
}

export function composeExerciseLibraryFacades(handles: {
  database: DatabaseClient;
}): ExerciseLibraryFacadesComposition {
  const postgresExerciseLibraryRepository =
    new PostgresExerciseLibraryRepository(handles.database);
  const unitOfWork = createUnitOfWork(handles.database);

  return {
    handles: {
      libraryExercisesFacade: new LibraryExercisesFacadeAdapter({
        listLibraryExercisesUseCase: new ListLibraryExercisesUseCase({
          exerciseLibraryPort: postgresExerciseLibraryRepository,
        }),
        unitOfWork,
      }),
      exerciseUsageFacade: new ExerciseUsageFacadeAdapter({
        recordExerciseUsageUseCase: new RecordExerciseUsageUseCase({
          exerciseLibraryPort: postgresExerciseLibraryRepository,
        }),
        unitOfWork,
      }),
    },
  };
}

export function composeExerciseVideoFiles(
  config: ExerciseVideosConfig,
): ExerciseVideoFiles {
  return {
    exerciseVideoFormatDetectorPort: createExerciseVideoFormatDetectorAdapter(),
    exerciseVideoStorePort: createExerciseVideoStoreAdapter(
      config.EXERCISE_VIDEO_ROOT,
    ),
  };
}
