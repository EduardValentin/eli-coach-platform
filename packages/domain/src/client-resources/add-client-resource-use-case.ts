import type { Clock } from "../shared";

import {
  ClientResource,
  ResourceFile,
  type ClientResourceOwner,
} from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIds } from "./client-resource-ids";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResourceStore } from "./client-resource-store";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";
import {
  ResourceDetails,
  type ResourceDetailsInput,
  type ResourceDetailsProblems,
} from "./resource-details";
import type {
  ReadableResourceDocument,
  ResourceDocumentPages,
} from "./resource-document-pages";
import type { ResourceFileFormatDetector } from "./resource-file-format-detector";
import {
  ResourceFileIntake,
  type ResourceFileJudgement,
  type ResourceRefusal,
} from "./resource-file-intake";
import type { ResourceFileKind } from "./resource-file-kind";
import type { ResourceImagePages } from "./resource-image-pages";

type ReceivedResourceFile = { originalName: string; bytes: Uint8Array };

type AddClientResourceCommand = {
  requester: ResourceRequester;
  clientId: string;
  details: ResourceDetailsInput;
  file: ReceivedResourceFile;
};

export type AddClientResourceResult =
  | { status: "added"; resource: ClientResource }
  | { status: "refused"; refusal: ResourceRefusal }
  | { status: "invalid-details"; problems: ResourceDetailsProblems }
  | { status: "not-found" }
  | { status: "failed" };

type AddClientResourceUseCaseOptions = {
  resources: ClientResources;
  resourceIds: ClientResourceIds;
  clients: ResourceClients;
  store: ClientResourceStore;
  documentPages: ResourceDocumentPages;
  imagePages: ResourceImagePages;
  fileFormats: ResourceFileFormatDetector;
  clock: Clock;
  incidents: ClientResourceIncidents;
};

type KeptFile =
  | { status: "kept"; pageCount: number | null }
  | { status: "refused"; refusal: ResourceRefusal };

type AcceptedFile = { owner: ClientResourceOwner; bytes: Uint8Array };

type AcceptedResource = {
  owner: ClientResourceOwner;
  details: ResourceDetails;
  judgement: Extract<ResourceFileJudgement, { status: "accepted" }>;
};

const SINGLE_PAGE = 1;

export class AddClientResourceUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: AddClientResourceUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: AddClientResourceCommand,
  ): Promise<AddClientResourceResult> {
    if (!this.access.mayAddFor(command.requester, command.clientId)) {
      return { status: "not-found" };
    }

    if (!(await this.options.clients.exists(command.clientId))) {
      return { status: "not-found" };
    }

    const details = ResourceDetails.from(command.details);

    if (details.status === "invalid") {
      return { status: "invalid-details", problems: details.problems };
    }

    const judgement = await this.judgeFile(command.file.bytes);

    if (judgement.status === "refused") {
      return this.refuse(command, judgement.refusal);
    }

    const owner = {
      clientId: command.clientId,
      resourceId: this.options.resourceIds.generate(),
    };

    try {
      return await this.keepAndRecord(command, {
        owner,
        details: details.details,
        judgement,
      });
    } catch (error) {
      return this.fail(owner, error);
    }
  }

  private async judgeFile(bytes: Uint8Array): Promise<ResourceFileJudgement> {
    const size = ResourceFileIntake.judgeSize(bytes.byteLength);

    if (size.status === "refused") return size;

    return ResourceFileIntake.judgeFormat(
      await this.options.fileFormats.detect(bytes),
    );
  }

  private async keepAndRecord(
    command: AddClientResourceCommand,
    { owner, details, judgement }: AcceptedResource,
  ): Promise<AddClientResourceResult> {
    const { bytes, originalName } = command.file;
    const kept = await this.keepFile(judgement.kind, { owner, bytes });

    if (kept.status === "refused") return this.refuse(command, kept.refusal);

    const vocabulary = await this.options.resources.tagVocabulary();
    const resource = ClientResource.added({
      id: owner.resourceId,
      clientId: owner.clientId,
      details: details.withStoredSpellings(vocabulary),
      file: ResourceFile.of({
        originalName,
        format: judgement.format,
        sizeBytes: bytes.byteLength,
        pageCount: kept.pageCount,
      }),
      at: this.options.clock.now(),
    });

    await this.options.resources.add(resource);
    this.options.incidents.resourceStored({
      ...owner,
      format: judgement.format,
      sizeBytes: bytes.byteLength,
      pageCount: kept.pageCount,
    });

    return { status: "added", resource };
  }

  private keepFile(
    kind: ResourceFileKind,
    file: AcceptedFile,
  ): Promise<KeptFile> {
    if (kind === "pdf") return this.keepDocument(file);
    if (kind === "image") return this.keepImage(file);

    return this.keepOriginalOnly(file);
  }

  private async keepDocument(file: AcceptedFile): Promise<KeptFile> {
    const reading = await this.options.documentPages.read(file.bytes.slice());

    if (reading.status === "unreadable") {
      return { status: "refused", refusal: "unreadable" };
    }

    try {
      const pageCount = ResourceFileIntake.judgePageCount(reading.pageCount);

      if (pageCount.status === "refused") return pageCount;

      await this.keepDocumentPages(file, reading);

      return { status: "kept", pageCount: reading.pageCount };
    } finally {
      await reading.close();
    }
  }

  private async keepDocumentPages(
    file: AcceptedFile,
    document: ReadableResourceDocument,
  ): Promise<void> {
    const { store } = this.options;

    await store.storeOriginal(file.owner, file.bytes);
    for await (const page of document.pages()) {
      await store.storePage(file.owner, page);
    }
    await store.storeThumbnail(file.owner, await document.thumbnail());
  }

  private async keepImage(file: AcceptedFile): Promise<KeptFile> {
    const rendering = await this.options.imagePages.render(file.bytes);

    if (rendering.status === "refused") {
      return { status: "refused", refusal: "unsupported-type" };
    }

    const { store } = this.options;

    await store.storeOriginal(file.owner, file.bytes);
    await store.storePage(file.owner, {
      pageNumber: SINGLE_PAGE,
      bytes: rendering.page,
    });
    await store.storeThumbnail(file.owner, rendering.thumbnail);

    return { status: "kept", pageCount: SINGLE_PAGE };
  }

  private async keepOriginalOnly(file: AcceptedFile): Promise<KeptFile> {
    await this.options.store.storeOriginal(file.owner, file.bytes);

    return { status: "kept", pageCount: null };
  }

  private refuse(
    command: AddClientResourceCommand,
    refusal: ResourceRefusal,
  ): AddClientResourceResult {
    this.options.incidents.resourceRefused({
      clientId: command.clientId,
      receivedBytes: command.file.bytes.byteLength,
      reason: refusal,
    });

    return { status: "refused", refusal };
  }

  private async fail(
    owner: ClientResourceOwner,
    error: unknown,
  ): Promise<AddClientResourceResult> {
    await this.options.store.remove(owner).catch(() => undefined);
    this.options.incidents.resourceStorageFailed({ ...owner, error });

    return { status: "failed" };
  }
}
