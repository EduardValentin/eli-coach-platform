import type { APIResponse } from "@playwright/test";

export type ApiAnswer = { status: number; body: unknown };

export async function answerOf(response: APIResponse): Promise<ApiAnswer> {
  const text = await response.text();

  try {
    return { status: response.status(), body: JSON.parse(text) };
  } catch {
    return { status: response.status(), body: text };
  }
}
