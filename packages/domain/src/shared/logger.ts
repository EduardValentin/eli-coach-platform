export type Logger = {
  error(message: string, details?: Record<string, unknown>): void;
};
