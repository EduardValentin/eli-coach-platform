import type { APIRequestContext, APIResponse } from "@playwright/test";

import type { SampleResource } from "./sample-resources";

export type ResourceResponse = {
  status: number;
  headers: Record<string, string>;
};

export type ResourceDetails = { title: string; description: string };

type AddedResourceAnswer = { resource: { id: string } };

const CLIENT_RESOURCES_PATH = "/api/client-resources";

const CREATED = 201;

function responseOf(response: APIResponse): ResourceResponse {
  return { status: response.status(), headers: response.headers() };
}

export class ResourceRequests {
  constructor(private readonly request: APIRequestContext) {}

  private post(
    clientId: string,
    sample: SampleResource,
    details: ResourceDetails,
  ): Promise<APIResponse> {
    return this.request.post(
      `${CLIENT_RESOURCES_PATH}/clients/${clientId}/resources`,
      { multipart: { file: sample, ...details } },
    );
  }

  async upload(
    clientId: string,
    sample: SampleResource,
    details: ResourceDetails,
  ): Promise<number> {
    const response = await this.post(clientId, sample, details);

    return response.status();
  }

  async add(
    clientId: string,
    sample: SampleResource,
    details: ResourceDetails,
  ): Promise<string> {
    const response = await this.post(clientId, sample, details);

    if (response.status() !== CREATED) {
      throw new Error(`Adding ${sample.name} answered ${response.status()}.`);
    }

    const answer = (await response.json()) as AddedResourceAnswer;

    return answer.resource.id;
  }

  async openPage(
    resourceId: string,
    pageNumber: number,
  ): Promise<ResourceResponse> {
    return responseOf(
      await this.request.get(
        `${CLIENT_RESOURCES_PATH}/${resourceId}/pages/${pageNumber}`,
      ),
    );
  }

  async openThumbnail(resourceId: string): Promise<ResourceResponse> {
    return responseOf(
      await this.request.get(
        `${CLIENT_RESOURCES_PATH}/${resourceId}/thumbnail`,
      ),
    );
  }

  async download(resourceId: string): Promise<ResourceResponse> {
    return responseOf(
      await this.request.get(`${CLIENT_RESOURCES_PATH}/${resourceId}/download`),
    );
  }
}
