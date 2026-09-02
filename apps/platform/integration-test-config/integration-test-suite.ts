import type { BaseTestContainer } from "./base-test-container";

/**
 * Containers live for the whole suite, which is why every test case must leave
 * the world as it found it: `reset` runs between them.
 */
export abstract class IntegrationTestSuite {
  protected abstract readonly containers: readonly BaseTestContainer[];

  async start(): Promise<void> {
    await Promise.all(this.containers.map((container) => container.start()));
  }

  async reset(): Promise<void> {
    for (const container of this.containers) {
      await container.reset();
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.containers.map((container) => container.stop()));
  }

  /**
   * Where each container can be reached, in the form the application reads it
   * from its environment. Handed to the application when it is started, rather
   * than assigned into this process: the suite and the application under test
   * no longer share one.
   */
  protected settings(): Record<string, string> {
    return this.containers.reduce<Record<string, string>>(
      (settings, container) => ({ ...settings, ...container.settings() }),
      {},
    );
  }
}
