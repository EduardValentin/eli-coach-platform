import type { ExerciseVideoViewer } from "./exercise-video-viewer";

export class ExerciseVideoAccess {
  async libraryOwnerFor(viewer: ExerciseVideoViewer): Promise<string | null> {
    switch (viewer.kind) {
      case "coach":
        return viewer.accountId;
      case "client":
      case "visitor":
        return null;
    }
  }
}
