type MethodNotAllowedResponseOptions = {
  allowedMethods: readonly string[];
};

type ReadJsonRequestBodyOptions<T> = {
  emptyBodyValue: T;
};

type HttpJsonErrorOptions = {
  body: unknown;
  headers?: HeadersInit;
  status: number;
};

export class HttpJsonError extends Error {
  readonly body: unknown;
  readonly headers?: HeadersInit;
  readonly status: number;

  constructor(options: HttpJsonErrorOptions) {
    super(`HTTP ${options.status}`);
    this.body = options.body;
    this.headers = options.headers;
    this.status = options.status;
  }
}

export class HttpResponseError extends Error {
  readonly response: Response;

  constructor(response: Response) {
    super(`HTTP ${response.status}`);
    this.response = response;
  }
}

export async function handleHttpErrorResponse(
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpJsonError) {
      return Response.json(error.body, {
        headers: error.headers,
        status: error.status,
      });
    }

    if (error instanceof HttpResponseError) {
      return error.response;
    }

    throw error;
  }
}

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

export function throwMethodNotAllowedResponse(options: MethodNotAllowedResponseOptions): never {
  throw new HttpResponseError(createMethodNotAllowedResponse(options));
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
