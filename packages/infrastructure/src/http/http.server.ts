type MethodNotAllowedResponseOptions = {
  allowedMethods: readonly string[];
};

type ReadRequestBodyOptions = {
  maxBytes: number;
};

type TextRequestBodyResult =
  { status: "valid"; text: string } | { status: "too_large" };

type FormDataRequestBodyResult =
  | { status: "valid"; formData: FormData }
  | { status: "invalid" }
  | { status: "too_large" };

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

class HttpResponseError extends Error {
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

export function throwMethodNotAllowedResponse(
  options: MethodNotAllowedResponseOptions,
): never {
  throw new HttpResponseError(
    new Response("Method Not Allowed", {
      headers: {
        allow: options.allowedMethods.join(", "),
      },
      status: 405,
    }),
  );
}

export function createBadRequestResponse(message: string): Response {
  return Response.json({ message }, { status: 400 });
}

export async function readFormDataRequestBody(
  request: Request,
  options: ReadRequestBodyOptions,
): Promise<FormDataRequestBodyResult> {
  const contentType = request.headers.get("Content-Type");

  if (
    !contentType ||
    (!contentType.startsWith("application/x-www-form-urlencoded") &&
      !contentType.startsWith("multipart/form-data"))
  ) {
    return { status: "invalid" };
  }

  if (declaresLengthOver(request, options.maxBytes)) {
    return { status: "too_large" };
  }

  const body = await readRequestBodyWithinLimit(request, options.maxBytes);

  if (body.status === "too_large") {
    return body;
  }

  try {
    const boundedRequest = new Request(request.url, {
      body: body.bytes,
      headers: { "Content-Type": contentType },
      method: "POST",
    });

    return {
      status: "valid",
      formData: await boundedRequest.formData(),
    };
  } catch {
    return { status: "invalid" };
  }
}

export async function readTextRequestBody(
  request: Request,
  options: ReadRequestBodyOptions,
): Promise<TextRequestBodyResult> {
  if (declaresLengthOver(request, options.maxBytes)) {
    return { status: "too_large" };
  }

  const body = await readRequestBodyWithinLimit(request, options.maxBytes);

  if (body.status === "too_large") {
    return body;
  }

  return { status: "valid", text: new TextDecoder().decode(body.bytes) };
}

function declaresLengthOver(request: Request, maxBytes: number): boolean {
  const declaredLength = request.headers.get("Content-Length");

  return Boolean(
    declaredLength &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes),
  );
}

async function readRequestBodyWithinLimit(
  request: Request,
  maxBytes: number,
): Promise<
  | { status: "valid"; bytes: Uint8Array<ArrayBuffer> }
  | {
      status: "too_large";
    }
> {
  if (!request.body) {
    return { status: "valid", bytes: new Uint8Array() };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      break;
    }

    receivedBytes += chunk.value.byteLength;

    if (receivedBytes > maxBytes) {
      await reader.cancel();

      return { status: "too_large" };
    }

    chunks.push(chunk.value);
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { status: "valid", bytes };
}
