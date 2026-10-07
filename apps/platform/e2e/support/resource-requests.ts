import type { APIRequestContext, APIResponse } from "@playwright/test";

import type { SampleResource } from "./sample-resources";

export type ResourceResponse = {
  status: number;
  headers: Record<string, string>;
};

export type ResourceDetails = { title: string; description: string };

export type UploadAnswer = { status: number; body: unknown };

type AddedResourceAnswer = { resource: { id: string } };

const CLIENT_RESOURCES_PATH = "/api/client-resources";

const CREATED = 201;

function resourcePathOf(resourceId: string): string {
  return `${CLIENT_RESOURCES_PATH}/${resourceId}`;
}

function openedPathOf(resourceId: string): string {
  return `${resourcePathOf(resourceId)}/opened`;
}

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

  async uploadAnswer(
    clientId: string,
    sample: SampleResource,
    details: ResourceDetails,
  ): Promise<UploadAnswer> {
    const response = await this.post(clientId, sample, details);
    const text = await response.text();

    try {
      return { status: response.status(), body: JSON.parse(text) };
    } catch {
      return { status: response.status(), body: text };
    }
  }

  async pageImageBytes(
    resourceId: string,
    pageNumber: number,
  ): Promise<Buffer> {
    const response = await this.request.get(
      `${CLIENT_RESOURCES_PATH}/${resourceId}/pages/${pageNumber}`,
    );

    return response.body();
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

  async readStatuses(resourceId: string): Promise<number[]> {
    return [
      (await this.openPage(resourceId, 1)).status,
      (await this.openThumbnail(resourceId)).status,
      (await this.download(resourceId)).status,
    ];
  }

  async reachStatuses(resourceId: string): Promise<number[]> {
    return [
      ...(await this.readStatuses(resourceId)),
      await this.markOpened(resourceId),
    ];
  }

  async changeDetails(
    resourceId: string,
    details: ResourceDetails,
  ): Promise<number> {
    const response = await this.request.patch(resourcePathOf(resourceId), {
      data: details,
    });

    return response.status();
  }

  async remove(resourceId: string): Promise<number> {
    const response = await this.request.delete(resourcePathOf(resourceId));

    return response.status();
  }

  async markOpened(resourceId: string): Promise<number> {
    const response = await this.request.post(openedPathOf(resourceId));

    return response.status();
  }

  async readOpened(resourceId: string): Promise<number> {
    const response = await this.request.get(openedPathOf(resourceId));

    return response.status();
  }
}
