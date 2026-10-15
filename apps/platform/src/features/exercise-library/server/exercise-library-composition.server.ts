import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  CreateExerciseUseCase,
  EditExerciseUseCase,
  FindExerciseUseCase,
  ListExercisesUseCase,
  OpenExerciseVideoUseCase,
  StageExerciseVideoUseCase,
  type ExerciseLibraryIncidents,
  type ExerciseVideoFormatDetector,
  type ExerciseVideoStore,
} from "@eli-coach-platform/domain/exercise";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { ExerciseLibraryController } from "~/features/exercise-library/api/coach/exercise-library-controller.server";
import { PostgresExerciseLibrary } from "~/features/exercise-library/data/exercises/exercise-library-repository.server";
import { RandomExerciseIds } from "~/features/exercise-library/data/exercises/random-exercise-ids.server";

export type ExerciseLibraryFeature = {
  exerciseLibrary: ExerciseLibraryController;
};

type ExerciseLibraryFeatureHandles = {
  clock: Clock;
  database: DatabaseClient;
  incidents: ExerciseLibraryIncidents;
  videoFormats: ExerciseVideoFormatDetector;
  videoStore: ExerciseVideoStore;
};

export function composeExerciseLibraryFeature(
  handles: ExerciseLibraryFeatureHandles,
): ExerciseLibraryFeature {
  const library = new PostgresExerciseLibrary(handles.database);
  const { videoStore } = handles;
  const exerciseWriteDependencies = {
    library,
    clock: handles.clock,
    incidents: handles.incidents,
    formats: handles.videoFormats,
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
    }),
  };
}
