import type { Logger } from "@eli-coach-platform/domain/shared";

export function createConsoleLogger(): Logger {
  return { error: (message, details) => console.error(message, details) };
}
