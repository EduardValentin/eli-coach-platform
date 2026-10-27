export type RecipePhotoViewer =
  | { kind: "coach"; accountId: string }
  | { kind: "client"; authSubjectId: string }
  | { kind: "visitor" };
