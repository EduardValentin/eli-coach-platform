import { z } from "zod";

import { COACH_TRAINING_PATH } from "~/features/exercise-library/public/paths";

const libraryReturnStateSchema = z.object({
  library: z.string().startsWith("?"),
});

export type LibraryReturnState = z.infer<typeof libraryReturnStateSchema>;

export function libraryReturnState(search: string): LibraryReturnState {
  return { library: search };
}

export function libraryReturnPath(state: unknown): string {
  const carried = libraryReturnStateSchema.safeParse(state);

  return carried.success
    ? `${COACH_TRAINING_PATH}${carried.data.library}`
    : COACH_TRAINING_PATH;
}

export function returnPathAfterSave(
  redirectTo: string,
  state: unknown,
): string {
  return redirectTo === COACH_TRAINING_PATH
    ? libraryReturnPath(state)
    : redirectTo;
}
