import { readTextRequestBody } from "@eli-coach-platform/infrastructure/http/server";

export async function readJsonRequestBody(
  request: Request,
  options: { maxBytes: number },
): Promise<unknown> {
  const body = await readTextRequestBody(request, options);

  if (body.status !== "valid") {
    return undefined;
  }

  try {
    return JSON.parse(body.text);
  } catch {
    return undefined;
  }
}
