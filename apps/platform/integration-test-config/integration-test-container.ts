/**
 * One dependency this application talks to, run for real.
 *
 * A container declares how the application is told to reach it through
 * `settings`, never how it is faked. That is what keeps the application
 * assembled exactly as it is deployed: the suite merges these settings into
 * the runtime environment, and the real adapter does the rest.
 */
export abstract class IntegrationTestContainer {
  abstract start(): Promise<void>;

  /** Between test cases, so a suite-scoped container leaves no state behind. */
  abstract reset(): Promise<void>;

  abstract stop(): Promise<void>;

  abstract settings(): Record<string, string>;
}
