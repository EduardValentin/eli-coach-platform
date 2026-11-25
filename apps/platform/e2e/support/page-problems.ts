import type { ConsoleMessage, Page } from "@playwright/test";

type ConsoleNoise = { reason: string; matches: (text: string) => boolean };

const PROBLEM_CONSOLE_TYPES = ["error", "warning"];
const FIRST_FAILING_STATUS = 400;
const CANCELLED_BY_THE_PAGE = "net::ERR_ABORTED";
const SHOWN_TEXT_LENGTH = 160;

const ALLOWED_CONSOLE_NOISE: readonly ConsoleNoise[] = [
  {
    reason:
      "Clerk warns on every page that the suite runs on its Development instance's keys, which it always does.",
    matches: (text) => text.includes("loaded with development keys"),
  },
  {
    reason:
      "The dev server serves a preloaded @fontsource font from its /@fs/ file route, another address than the stylesheet asks for, so Chrome reports the preload unused; a build serves both from one address.",
    matches: (text) =>
      text.includes("/@fs/") &&
      text.includes("/@fontsource") &&
      text.includes("was preloaded using link preload but not used"),
  },
];

function isConsoleProblem(message: ConsoleMessage): boolean {
  const text = message.text();

  return (
    PROBLEM_CONSOLE_TYPES.includes(message.type()) &&
    !ALLOWED_CONSOLE_NOISE.some((noise) => noise.matches(text))
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
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText === CANCELLED_BY_THE_PAGE) return;

    problems.push(`request failed ${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() < FIRST_FAILING_STATUS) return;

    problems.push(
      `response ${response.status()} ${response.request().method()} ${response.url().slice(0, SHOWN_TEXT_LENGTH)}`,
    );
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));

  return problems;
}
