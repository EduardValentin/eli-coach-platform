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
  tags?: string[];
};

export type ResourceDetails = {
  title: string;
  description: string;
  tags: string[];
};

export type ResourceFileKind = "pdf" | "image" | "word" | "excel";

export type AddedResource = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  file: {
    originalName: string;
    downloadName: string;
    kind: ResourceFileKind;
    sizeBytes: number;
    pageCount: number | null;
  };
  addedAt: string;
  openedAt: string | null;
};

export type ClientResourceRow = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  originalName: string;
  format: string;
  sizeBytes: number;
  pageCount: number | null;
  addedAt: Date;
  openedAt: Date | null;
};

const CLIENT_RESOURCES_API = "/api/client-resources";

const CLIENT_RESOURCES_PAGE = "/client/resources";

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

  markOpened(requester: Requester, resourceId: string): Promise<Response> {
    return this.send(
      requester,
      `${CLIENT_RESOURCES_API}/${resourceId}/opened`,
      {
        method: "POST",
      },
    );
  }

  changeDetails(
    requester: Requester,
    resourceId: string,
    details: ResourceDetails,
  ): Promise<Response> {
    return this.send(requester, `${CLIENT_RESOURCES_API}/${resourceId}`, {
      body: JSON.stringify(details),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
  }

  remove(requester: Requester, resourceId: string): Promise<Response> {
    return this.send(requester, `${CLIENT_RESOURCES_API}/${resourceId}`, {
      method: "DELETE",
    });
  }

  openResourcesPage(requester: AccountSession, query = ""): Promise<Response> {
    return this.rig.requestAs(requester, `${CLIENT_RESOURCES_PAGE}${query}`);
  }

  resourceRowsOf(clientId: string): Promise<ClientResourceRow[]> {
    return this.rig.suite.postgres.queryRows<ClientResourceRow>({
      sql: `select r.id, r.title, r.description,
        array(select t.tag from app.client_resource_tags t where t.resource_id = r.id order by t.position) as tags,
        r.original_name as "originalName", r.format, r.size_bytes as "sizeBytes", r.page_count as "pageCount", r.added_at as "addedAt", r.opened_at as "openedAt"
        from app.client_resources r where r.client_id = $1 order by r.added_at desc, r.id desc`,
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

  for (const tag of upload.tags ?? []) {
    form.append("tags", tag);
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
