import type { ConsoleMessage, Page } from "@playwright/test";

const CLERK_DEVELOPMENT_KEYS_NOTICE = "loaded with development keys";
const PROBLEM_CONSOLE_TYPES = ["error", "warning"];
const FIRST_FAILING_STATUS = 400;
const SHOWN_TEXT_LENGTH = 160;

function isConsoleProblem(message: ConsoleMessage): boolean {
  return (
    PROBLEM_CONSOLE_TYPES.includes(message.type()) &&
    !message.text().includes(CLERK_DEVELOPMENT_KEYS_NOTICE)
  );
}

export function collectPageProblems(page: Page): readonly string[] {
  const problems: string[] = [];

  page.on("console", (message) => {
    if (!isConsoleProblem(message)) return;

    problems.push(
      `${message.type()} at ${page.url()} from ${message.location().url}: ${message.text().slice(0, SHOWN_TEXT_LENGTH)}`,
    );
  });
  page.on("requestfailed", (request) =>
    problems.push(`request failed ${request.method()} ${request.url()}`),
  );
  page.on("response", (response) => {
    if (response.status() < FIRST_FAILING_STATUS) return;

    problems.push(
      `response ${response.status()} ${response.request().method()} ${response.url().slice(0, SHOWN_TEXT_LENGTH)}`,
    );
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));

  return problems;
}
