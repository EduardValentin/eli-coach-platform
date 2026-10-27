const UNREACHABLE_STATUS = 503;

export function refusedSubmission(httpStatus: number): Response {
  return Response.json(
    { status: "refused", httpStatus },
    { status: httpStatus },
  );
}

export function unreachableSubmission(): Response {
  return Response.json(
    { status: "unreachable" },
    { status: UNREACHABLE_STATUS },
  );
}
