import type { LoggerPort } from "./logger-port.server";

export class ConsoleLoggerAdapter implements LoggerPort {
  error(...entry: Parameters<LoggerPort["error"]>) {
    return console.error(...entry);
  }

  warn(...entry: Parameters<LoggerPort["warn"]>) {
    return console.warn(...entry);
  }

  info(...entry: Parameters<LoggerPort["info"]>) {
    return console.info(...entry);
  }
}
