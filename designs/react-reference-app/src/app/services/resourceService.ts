import {
  checkResourceUpload,
  coachTagVocabulary,
  hasPagePreview,
  type Resource,
  type ResourceAddition,
  type ResourceDetails,
  type ResourceFileKind,
  type ServerDecidedRefusal,
} from '../domain/resources';
import { resolveTag, uniqueTags } from '../domain/tags';

export const RESOURCE_SEEDS = ['seeded', 'empty'] as const;
export type ResourceSeed = (typeof RESOURCE_SEEDS)[number];

export const RESOURCE_LOAD_OUTCOMES = ['works', 'fails'] as const;
export type ResourceLoad = (typeof RESOURCE_LOAD_OUTCOMES)[number];

export const RESOURCE_UPLOAD_OUTCOMES = [
  'works',
  'fails',
  'holds',
  'too-many-pages',
  'unreadable',
] as const;
export type ResourceUpload = (typeof RESOURCE_UPLOAD_OUTCOMES)[number];

type ServerAnswer = Exclude<ResourceUpload, 'holds'>;

export const RESOURCE_LATENCY_MS = 600;
export const UPLOAD_STEP_MS = 250;
export const UPLOAD_STEPS = 5;
export const PREPARING_MS = 800;

const PDF_REFUSAL_FOR: Partial<Record<ResourceUpload, ServerDecidedRefusal>> = {
  'too-many-pages': 'too-many-pages',
  unreadable: 'unreadable',
};

export const RESOURCES_UNAVAILABLE = 'Resources could not be loaded.';
export const UPLOAD_FAILED = 'The upload did not go through.';

export type ResourcePageRenderer = {
  render(upload: { title: string; kind: ResourceFileKind; file: File }): string[];
};

export type ResourceUploadRequest = {
  clientId: string;
  file: File;
  details: ResourceDetails;
};

export type UploadOptions = {
  outcome: ResourceUpload;
  onProgress: (fraction: number) => void;
};

export type ResourceDownload = { blob: Blob; fileName: string };

export type ResourceServerSetup = {
  records: readonly Resource[];
  renderer: ResourcePageRenderer;
  now: () => Date;
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function serverRefusalOf(
  kind: ResourceFileKind,
  outcome: ServerAnswer,
): ServerDecidedRefusal | null {
  if (kind !== 'pdf') return null;

  return PDF_REFUSAL_FOR[outcome] ?? null;
}

function placeholderFile(resource: Resource): Blob {
  return new Blob([`${resource.title}\n\nA placeholder for ${resource.file.name}.`], {
    type: 'text/plain',
  });
}

export class ResourceServer {
  private records: Resource[];
  private readonly files = new Map<string, File>();
  private readonly heldAnswers = new Set<(answer: ServerAnswer) => void>();
  private readonly renderer: ResourcePageRenderer;
  private readonly now: () => Date;

  constructor(setup: ResourceServerSetup) {
    this.records = [...setup.records];
    this.renderer = setup.renderer;
    this.now = setup.now;
  }

  async listForClient(clientId: string, load: ResourceLoad): Promise<Resource[]> {
    await wait(RESOURCE_LATENCY_MS);
    if (load === 'fails') throw new Error(RESOURCES_UNAVAILABLE);

    return this.records.filter((resource) => resource.clientId === clientId);
  }

  async listTags(): Promise<string[]> {
    await wait(RESOURCE_LATENCY_MS);

    return coachTagVocabulary(this.records);
  }

  async add(request: ResourceUploadRequest, options: UploadOptions): Promise<ResourceAddition> {
    const check = checkResourceUpload(request.file);
    if (!check.accepted) throw new Error(UPLOAD_FAILED);

    for (let step = 1; step <= UPLOAD_STEPS; step += 1) {
      await wait(UPLOAD_STEP_MS);
      options.onProgress(step / UPLOAD_STEPS);
    }
    if (options.outcome === 'fails') throw new Error(UPLOAD_FAILED);

    const answer = await this.answerAfterPreparing(options.outcome);
    if (answer === 'fails') throw new Error(UPLOAD_FAILED);
    const refusal = serverRefusalOf(check.kind, answer);
    if (refusal) return { status: 'refused', refusal };

    const details = this.withVocabularyCasing(request.details);
    const pageImageUrls = hasPagePreview(check.kind)
      ? this.renderer.render({ title: details.title, kind: check.kind, file: request.file })
      : [];
    const resource: Resource = {
      id: crypto.randomUUID(),
      clientId: request.clientId,
      ...details,
      file: {
        name: request.file.name,
        kind: check.kind,
        sizeBytes: request.file.size,
      },
      pageImageUrls,
      addedAt: this.now(),
      openedAt: null,
    };
    this.records = [resource, ...this.records];
    this.files.set(resource.id, request.file);

    return { status: 'added', resource };
  }

  releaseHeldUploads(outcome: ResourceUpload): void {
    if (outcome === 'holds') return;

    const held = [...this.heldAnswers];
    this.heldAnswers.clear();
    held.forEach((answer) => answer(outcome));
  }

  private async answerAfterPreparing(outcome: ResourceUpload): Promise<ServerAnswer> {
    if (outcome === 'holds') {
      return new Promise((answer) => this.heldAnswers.add(answer));
    }

    await wait(PREPARING_MS);
    return outcome;
  }

  async updateDetails(id: string, details: ResourceDetails): Promise<Resource> {
    await wait(RESOURCE_LATENCY_MS);
    const others = this.records.filter((resource) => resource.id !== id);
    const updated = {
      ...this.recordFor(id),
      ...this.withVocabularyCasing(details, others),
    };
    this.records = this.records.map((resource) =>
      resource.id === id ? updated : resource,
    );

    return updated;
  }

  async remove(id: string): Promise<void> {
    await wait(RESOURCE_LATENCY_MS);
    this.recordFor(id);
    this.records = this.records.filter((resource) => resource.id !== id);
    this.files.delete(id);
  }

  async markOpened(id: string): Promise<Resource> {
    await wait(RESOURCE_LATENCY_MS);
    const resource = this.recordFor(id);
    if (resource.openedAt) return resource;

    const opened = { ...resource, openedAt: this.now() };
    this.records = this.records.map((record) => (record.id === id ? opened : record));

    return opened;
  }

  async download(id: string): Promise<ResourceDownload> {
    const resource = this.recordFor(id);

    return {
      blob: this.files.get(id) ?? placeholderFile(resource),
      fileName: resource.file.name,
    };
  }

  private recordFor(id: string): Resource {
    const resource = this.records.find((record) => record.id === id);
    if (!resource) throw new Error(`No resource ${id}.`);

    return resource;
  }

  private withVocabularyCasing(
    details: ResourceDetails,
    records: readonly Resource[] = this.records,
  ): ResourceDetails {
    const vocabulary = coachTagVocabulary(records);
    const tags = details.tags
      .map((tag) => resolveTag(tag, vocabulary))
      .filter((tag): tag is string => tag !== null);

    return { ...details, tags: uniqueTags(tags) };
  }
}
