import type { BaseTestContainer } from "./base-test-container";

/**
 * Containers live for the whole suite, which is why every case must leave the
 * world as it found it: `reset` runs between them.
 */
export abstract class IntegrationTestSuite {
  protected abstract readonly containers: readonly BaseTestContainer[];

  async start(): Promise<void> {
    await Promise.all(this.containers.map((container) => container.start()));
    // Published before the application is first imported, so its modules read
    // the ports these containers were actually assigned.
    Object.assign(process.env, this.settings());
  }

  async reset(): Promise<void> {
    for (const container of this.containers) {
      await container.reset();
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.containers.map((container) => container.stop()));
  }

  protected settings(): Record<string, string> {
    return this.containers.reduce<Record<string, string>>(
      (settings, container) => ({ ...settings, ...container.settings() }),
      {},
    );
  }
}
