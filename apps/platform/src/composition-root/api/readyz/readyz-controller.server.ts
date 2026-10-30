import type { AppConfig } from "~/composition-root/runtime-environment";
import {
  type DatabaseConfig,
  hasCompleteDatabaseConfiguration,
} from "~/shared/database/connection";

export class ReadyzController {
  constructor(private readonly appConfig: AppConfig & DatabaseConfig) {}

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
      this.appConfig.ENVIRONMENT !== "local" &&
      !hasCompleteDatabaseConfiguration(this.appConfig)
    );
  }
}
