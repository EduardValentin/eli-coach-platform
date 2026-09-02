import { hasCompleteDatabaseConfiguration, type RuntimeEnvironment } from "@eli-coach-platform/config";

export class ReadyzController {
  constructor(private readonly runtimeEnvironment: RuntimeEnvironment) {}

  // The docker HEALTHCHECK and the blue/green gate both poll this route —
  // an instance deployed without DATABASE_* configuration has to fail it,
  // or a misconfigured deployment reports healthy right up until the first
  // request that actually touches a repository. LOCAL (and CI's Lighthouse
  // run, which also sets ENVIRONMENT=local) never carries DATABASE_*, so
  // that environment is exempt. This is a presence check only — it never
  // opens a connection, so it can't turn a slow database into a false
  // "unhealthy".
  getStatus(): Response {
    if (this.isMissingRequiredDatabaseConfiguration()) {
      return new Response("database configuration incomplete", {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    return new Response("ok", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  private isMissingRequiredDatabaseConfiguration(): boolean {
    return (
      this.runtimeEnvironment.ENVIRONMENT !== "local" &&
      !hasCompleteDatabaseConfiguration(this.runtimeEnvironment)
    );
  }
}
