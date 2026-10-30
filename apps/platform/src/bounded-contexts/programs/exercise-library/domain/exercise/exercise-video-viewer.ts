export type ExerciseVideoViewer =
  | { kind: "coach"; accountId: string }
  | { kind: "client"; authSubjectId: string }
  | { kind: "visitor" };
