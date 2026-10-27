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
  type ExerciseLibraryIncidents,
  type ExerciseVideoFormatDetector,
  type ExerciseVideoStore,
} from "@eli-coach-platform/domain/exercise";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { ExerciseLibraryController } from "~/bounded-contexts/programs/exercise-library/api/coach/exercise-library-controller.server";
import { PostgresExerciseLibrary } from "~/bounded-contexts/programs/exercise-library/data/exercises/exercise-library-repository.server";
import { RandomExerciseIds } from "~/bounded-contexts/programs/exercise-library/data/exercises/random-exercise-ids.server";
import { RandomExerciseVideoIds } from "~/bounded-contexts/programs/exercise-library/data/exercises/random-exercise-video-ids.server";

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
        incidents: handles.incidents,
      }),
      deleteExercise: new DeleteExerciseUseCase({
        library,
        videos: new ExerciseVideoCleanup({
          store: videoStore,
          incidents: handles.incidents,
        }),
      }),
    }),
  };
}
