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
  type ExerciseVideoFormatDetector,
  type ExerciseVideoStore,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type { Clock } from "~/bounded-contexts/programs/exercise-library/domain/clock";

import { ExerciseLibraryController } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/coach/exercise-library-controller.server";
import { PostgresExerciseLibrary } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercises/exercise-library-repository.server";
import { RandomExerciseIds } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercises/random-exercise-ids.server";
import { RandomExerciseVideoIds } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/exercises/random-exercise-video-ids.server";
import type { ExerciseLibraryFeature } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createExerciseLibraryIncidents } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/logging/exercise-library-incidents.server";

type ExerciseLibraryFeatureHandles = {
  clock: Clock;
  database: DatabaseClient;
  logger: Logger;
  videoFormats: ExerciseVideoFormatDetector;
  videoStore: ExerciseVideoStore;
};

export function composeExerciseLibraryFeature(
  handles: ExerciseLibraryFeatureHandles,
): ExerciseLibraryFeature {
  const incidents = createExerciseLibraryIncidents(handles.logger);
  const library = new PostgresExerciseLibrary(handles.database);
  const { videoStore } = handles;
  const exerciseWriteDependencies = {
    library,
    clock: handles.clock,
    incidents,
    formats: handles.videoFormats,
    videoIds: new RandomExerciseVideoIds(),
    store: videoStore,
  };

  return {
    exerciseLibrary: new ExerciseLibraryController({
      listExercises: new ListExercisesUseCase({ library }),
      findExercise: new FindExerciseUseCase({ library }),
      createExercise: new CreateExerciseUseCase({
        ...exerciseWriteDependencies,
        ids: new RandomExerciseIds(),
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
