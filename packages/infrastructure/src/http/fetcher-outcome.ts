import { refusedSubmission, unreachableSubmission } from "./failed-submission";

type ServerAction = () => Promise<unknown>;

function refusalStatusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  return typeof error.status === "number" ? error.status : null;
}

function failedSubmissionOf(error: unknown): Response {
  const httpStatus = refusalStatusOf(error);

  if (httpStatus === null) {
    return unreachableSubmission();
  }

  return refusedSubmission(httpStatus);
}

export async function fetcherOutcomeOf(
  serverAction: ServerAction,
): Promise<unknown> {
  try {
    return await serverAction();
  } catch (error) {
    return failedSubmissionOf(error);
  }
}
