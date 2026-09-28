import { readTextRequestBody } from "@eli-coach-platform/infrastructure/http/server";

export async function readJsonRequestBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const body = await readTextRequestBody(request, { maxBytes });

  if (body.status !== "valid") {
    return undefined;
  }

  try {
    return JSON.parse(body.text);
  } catch {
    return undefined;
  }
}
