type MethodNotAllowedResponseOptions = {
  allowedMethods: readonly string[];
};

type ReadJsonRequestBodyOptions<T> = {
  emptyBodyValue: T;
};

export function createMethodNotAllowedResponse(
  options: MethodNotAllowedResponseOptions,
): Response {
  return new Response("Method Not Allowed", {
    headers: {
      allow: options.allowedMethods.join(", "),
    },
    status: 405,
  });
}

export function createBadRequestResponse(message: string): Response {
  return Response.json({ message }, { status: 400 });
}

export async function readJsonRequestBody<T>(
  request: Request,
  options: ReadJsonRequestBodyOptions<T>,
): Promise<T> {
  const body = await request.text();

  if (!body) {
    return options.emptyBodyValue;
  }

  return JSON.parse(body) as T;
}
