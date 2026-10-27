export type Logger = {
  error(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
};

export function createConsoleLogger(): Logger {
  return {
    error: (...entry) => console.error(...entry),
    warn: (...entry) => console.warn(...entry),
    info: (...entry) => console.info(...entry),
  };
}
