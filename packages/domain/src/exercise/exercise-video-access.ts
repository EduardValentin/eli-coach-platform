import type { Exercise } from "./exercise";
import type { ExerciseVideoViewer } from "./exercise-video-viewer";

export class ExerciseVideoAccess {
  async admits(
    viewer: ExerciseVideoViewer,
    _exercise: Exercise,
  ): Promise<boolean> {
    switch (viewer.kind) {
      case "coach":
        return true;
      case "client":
      case "visitor":
        return false;
    }
  }
}
