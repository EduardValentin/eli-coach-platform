import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import {
  ClientResource,
  ResourceFile,
  type ClientResourceOwner,
} from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIdsPort } from "./client-resource-ids-port";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type { ClientResourceStorePort } from "./client-resource-store-port";
import type { ClientResourcesPort } from "./client-resources-port";
import {
  ResourceDetails,
  type ResourceDetailsInput,
  type ResourceDetailsProblems,
} from "./resource-details";
import type {
  ReadableResourceDocument,
  ResourceDocumentPagesPort,
} from "./resource-document-pages-port";
import type { ResourceFileFormatDetectorPort } from "./resource-file-format-detector-port";
import {
  ResourceFileIntake,
  type ResourceFileJudgement,
  type ResourceRefusal,
} from "./resource-file-intake";
import type { ResourceFileKind } from "./resource-file-kind";
import type { ResourceImagePagesPort } from "./resource-image-pages-port";

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
  clientResourcesPort: ClientResourcesPort;
  clientResourceIdsPort: ClientResourceIdsPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  clientResourceStorePort: ClientResourceStorePort;
  resourceDocumentPagesPort: ResourceDocumentPagesPort;
  resourceImagePagesPort: ResourceImagePagesPort;
  resourceFileFormatDetectorPort: ResourceFileFormatDetectorPort;
  clockPort: ClockPort;
  clientResourceIncidentsPort: ClientResourceIncidentsPort;
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

    if (
      (await this.options.clientReachPort.findById(command.clientId)) === null
    ) {
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
      resourceId: this.options.clientResourceIdsPort.generate(),
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
      await this.options.resourceFileFormatDetectorPort.detect(bytes),
    );
  }

  private async keepAndRecord(
    command: AddClientResourceCommand,
    { owner, details, judgement }: AcceptedResource,
  ): Promise<AddClientResourceResult> {
    const { bytes, originalName } = command.file;
    const kept = await this.keepFile(judgement.kind, { owner, bytes });

    if (kept.status === "refused") return this.refuse(command, kept.refusal);

    const vocabulary = await this.options.clientResourcesPort.tagVocabulary();
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
      at: this.options.clockPort.now(),
    });

    await this.options.clientResourcesPort.add(resource);
    this.options.clientResourceIncidentsPort.resourceStored({
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
    const reading = await this.options.resourceDocumentPagesPort.read(
      file.bytes.slice(),
    );

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
    const { clientResourceStorePort } = this.options;

    await clientResourceStorePort.storeOriginal(file.owner, file.bytes);
    for await (const page of document.pages()) {
      await clientResourceStorePort.storePage(file.owner, page);
    }
    await clientResourceStorePort.storeThumbnail(
      file.owner,
      await document.thumbnail(),
    );
  }

  private async keepImage(file: AcceptedFile): Promise<KeptFile> {
    const rendering = await this.options.resourceImagePagesPort.render(
      file.bytes,
    );

    if (rendering.status === "refused") {
      return { status: "refused", refusal: "unsupported-type" };
    }

    const { clientResourceStorePort } = this.options;

    await clientResourceStorePort.storeOriginal(file.owner, file.bytes);
    await clientResourceStorePort.storePage(file.owner, {
      pageNumber: SINGLE_PAGE,
      bytes: rendering.page,
    });
    await clientResourceStorePort.storeThumbnail(
      file.owner,
      rendering.thumbnail,
    );

    return { status: "kept", pageCount: SINGLE_PAGE };
  }

  private async keepOriginalOnly(file: AcceptedFile): Promise<KeptFile> {
    await this.options.clientResourceStorePort.storeOriginal(
      file.owner,
      file.bytes,
    );

    return { status: "kept", pageCount: null };
  }

  private refuse(
    command: AddClientResourceCommand,
    refusal: ResourceRefusal,
  ): AddClientResourceResult {
    this.options.clientResourceIncidentsPort.resourceRefused({
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
    await this.options.clientResourceStorePort
      .remove(owner)
      .catch(() => undefined);
    this.options.clientResourceIncidentsPort.resourceStorageFailed({
      ...owner,
      error,
    });

    return { status: "failed" };
  }
}
