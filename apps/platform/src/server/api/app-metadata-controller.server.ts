import { appMetadataSchema } from "./service-metadata";

type AppMetadataControllerOptions = {
  appName: string;
  environment: string;
  version: string;
};

export class AppMetadataController {
  constructor(private readonly options: AppMetadataControllerOptions) {}

  getMetadata(): Response {
    return Response.json(appMetadataSchema.parse(this.options));
  }
}
