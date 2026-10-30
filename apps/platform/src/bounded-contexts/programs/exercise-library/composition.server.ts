import type { DatabaseClient } from "~/shared/database";
import {
  ArchiveExerciseUseCase,
  CreateExerciseUseCase,
  DeleteExerciseUseCase,
  EditExerciseUseCase,
  ExerciseVideoCleanup,
  FindExerciseUseCase,
  ListExercisesUseCase,
  OpenExerciseVideoUseCase,
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

type ExerciseVideoFiles = {
  videoFormats: ExerciseVideoFormatDetectorPort;
  videoStore: ExerciseVideoStorePort;
};

type ExerciseLibraryFeatureHandles = ExerciseVideoFiles & {
  clock: ClockPort;
  database: DatabaseClient;
  logger: LoggerPort;
};

export function composeExerciseLibraryFeature(
  handles: ExerciseLibraryFeatureHandles,
): ExerciseLibraryFeature {
  const incidents = new ExerciseLibraryIncidentsAdapter(handles.logger);
  const library = new PostgresExerciseLibraryRepository(handles.database);
  const { videoStore } = handles;
  const exerciseWriteDependencies = {
    library,
    clock: handles.clock,
    incidents,
    formats: handles.videoFormats,
    videoIds: new RandomExerciseVideoIdsAdapter(),
    store: videoStore,
  };

  return {
    exerciseLibrary: new ExerciseLibraryController({
      listExercises: new ListExercisesUseCase({ library }),
      findExercise: new FindExerciseUseCase({ library }),
      createExercise: new CreateExerciseUseCase({
        ...exerciseWriteDependencies,
        ids: new RandomExerciseIdsAdapter(),
      }),
      editExercise: new EditExerciseUseCase(exerciseWriteDependencies),
      stageExerciseVideo: new StageExerciseVideoUseCase({ store: videoStore }),
      openExerciseVideo: new OpenExerciseVideoUseCase({
        library,
        store: videoStore,
      }),
      archiveExercise: new ArchiveExerciseUseCase({
        library,
        clock: handles.clock,
      }),
      restoreExercise: new RestoreExerciseUseCase({
        library,
        clock: handles.clock,
        incidents,
      }),
      deleteExercise: new DeleteExerciseUseCase({
        library,
        videos: new ExerciseVideoCleanup({
          store: videoStore,
          incidents,
        }),
      }),
    }),
  };
}

export function composeExerciseVideoFiles(
  config: ExerciseVideosConfig,
): ExerciseVideoFiles {
  return {
    videoFormats: createExerciseVideoFormatDetectorAdapter(),
    videoStore: createExerciseVideoStoreAdapter(config.EXERCISE_VIDEO_ROOT),
  };
}
