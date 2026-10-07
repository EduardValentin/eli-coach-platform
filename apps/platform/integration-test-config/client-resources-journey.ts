import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AccountSession, PlatformRig } from "./platform-rig";

export const VISITOR = "visitor";

type Requester = AccountSession | typeof VISITOR;

export type ResourceUpload = {
  bytes: Uint8Array;
  fileName: string;
  title?: string;
  description?: string;
};

export type ResourceFileKind = "pdf" | "image" | "word" | "excel";

export type AddedResource = {
  id: string;
  title: string;
  description: string;
  file: {
    originalName: string;
    downloadName: string;
    kind: ResourceFileKind;
    sizeBytes: number;
    pageCount: number | null;
  };
  addedAt: string;
};

export type ClientResourceRow = {
  id: string;
  title: string;
  description: string;
  originalName: string;
  format: string;
  sizeBytes: number;
  pageCount: number | null;
  addedAt: Date;
};

const CLIENT_RESOURCES_API = "/api/client-resources";

export class ClientResourcesJourney {
  constructor(private readonly rig: PlatformRig) {}

  upload(
    requester: Requester,
    clientId: string,
    upload: ResourceUpload,
  ): Promise<Response> {
    return this.send(requester, clientResourcesPath(clientId), {
      body: resourceForm(upload),
      method: "POST",
    });
  }

  async uploadAccepted(
    requester: Requester,
    clientId: string,
    upload: ResourceUpload,
  ): Promise<AddedResource> {
    const response = await this.upload(requester, clientId, upload);

    if (response.status !== 201) {
      throw new Error(
        `Adding ${upload.fileName} answered ${response.status}: ${await response.text()}`,
      );
    }

    const { resource } = (await response.json()) as {
      resource: AddedResource;
    };

    return resource;
  }

  openPage(
    requester: Requester,
    resourceId: string,
    pageNumber: number | string,
  ): Promise<Response> {
    return this.send(
      requester,
      `${CLIENT_RESOURCES_API}/${resourceId}/pages/${pageNumber}`,
    );
  }

  openThumbnail(requester: Requester, resourceId: string): Promise<Response> {
    return this.send(
      requester,
      `${CLIENT_RESOURCES_API}/${resourceId}/thumbnail`,
    );
  }

  download(requester: Requester, resourceId: string): Promise<Response> {
    return this.send(
      requester,
      `${CLIENT_RESOURCES_API}/${resourceId}/download`,
    );
  }

  resourceRowsOf(clientId: string): Promise<ClientResourceRow[]> {
    return this.rig.suite.postgres.queryRows<ClientResourceRow>({
      sql: 'select id, title, description, original_name as "originalName", format, size_bytes as "sizeBytes", page_count as "pageCount", added_at as "addedAt" from app.client_resources where client_id = $1 order by added_at desc, id desc',
      values: [clientId],
    });
  }

  async storedFileNamesOf(
    clientId: string,
    resourceId: string,
  ): Promise<string[]> {
    const names = await readdir(
      join(this.rig.suite.resourceRoot(), clientId, resourceId),
    ).catch(whenMissing<string[]>([]));

    return names.sort();
  }

  storedFileOf(
    clientId: string,
    resourceId: string,
    fileName: string,
  ): Promise<Buffer> {
    return readFile(
      join(this.rig.suite.resourceRoot(), clientId, resourceId, fileName),
    );
  }

  async storedFileCountOf(clientId: string): Promise<number> {
    const files = await readdir(join(this.rig.suite.resourceRoot(), clientId), {
      recursive: true,
      withFileTypes: true,
    }).catch(whenMissing([]));

    return files.filter((file) => file.isFile()).length;
  }

  private send(
    requester: Requester,
    target: string,
    init: RequestInit = {},
  ): Promise<Response> {
    if (requester === VISITOR) {
      return this.rig.suite.request(
        new Request(this.rig.suite.url(target), init),
      );
    }

    return this.rig.requestAs(requester, target, init);
  }
}

function clientResourcesPath(clientId: string): string {
  return `${CLIENT_RESOURCES_API}/clients/${clientId}/resources`;
}

function resourceForm(upload: ResourceUpload): FormData {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(upload.bytes)], upload.fileName));
  form.set("title", upload.title ?? upload.fileName);

  if (upload.description !== undefined) {
    form.set("description", upload.description);
  }

  return form;
}

function whenMissing<T>(fallback: T): (error: unknown) => T {
  return (error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return fallback;
  };
}
