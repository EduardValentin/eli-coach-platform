type ServerAction = () => Promise<unknown>;

const UNREACHABLE_STATUS = 503;

function refusalStatusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  return typeof error.status === "number" ? error.status : null;
}

function failedSubmissionOf(error: unknown): Response {
  const httpStatus = refusalStatusOf(error);

  if (httpStatus === null) {
    return Response.json(
      { status: "unreachable" },
      { status: UNREACHABLE_STATUS },
    );
  }

  return Response.json(
    { status: "refused", httpStatus },
    { status: httpStatus },
  );
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
