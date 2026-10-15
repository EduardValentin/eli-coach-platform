export type ExerciseVideoViewer =
  | { kind: "coach" }
  | { kind: "client"; authSubjectId: string }
  | { kind: "visitor" };
