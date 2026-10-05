import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resource } from '../domain/resources';
import {
  RESOURCE_LATENCY_MS,
  RESOURCES_UNAVAILABLE,
  ResourceServer,
  UPLOAD_FAILED,
  UPLOAD_STEPS,
  UPLOAD_STEP_MS,
  type ResourcePageRenderer,
} from './resourceService';

const NOW = new Date('2026-10-03T09:00:00.000Z');

const renderer: ResourcePageRenderer = {
  render: ({ kind }) => (kind === 'pdf' ? ['p1', 'p2', 'p3'] : ['p1']),
};

function stored(overrides: Partial<Resource>): Resource {
  return {
    id: 'warm-up',
    clientId: 'client-1',
    title: 'Glute activation warm-up',
    description: 'Before every session.',
    tags: ['Training'],
    file: { name: 'warm-up.pdf', kind: 'pdf', sizeBytes: 2048 },
    pageImageUrls: ['a', 'b'],
    addedAt: new Date('2026-09-20T09:00:00.000Z'),
    openedAt: null,
    ...overrides,
  };
}

function serverWith(records: Resource[]): ResourceServer {
  return new ResourceServer({ records, renderer, now: () => NOW });
}

async function settled<T>(pending: Promise<T>, milliseconds = RESOURCE_LATENCY_MS): Promise<T> {
  await vi.advanceTimersByTimeAsync(milliseconds);

  return pending;
}

const UPLOAD_TIME = UPLOAD_STEPS * UPLOAD_STEP_MS;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('listing a client’s resources', () => {
  it('returns only the resources that belong to that client', async () => {
    // arrange
    const server = serverWith([
      stored({ id: 'mine' }),
      stored({ id: 'someone-else', clientId: 'c2' }),
    ]);

    // act
    const listed = await settled(server.listForClient('client-1', 'works'));

    // assert
    expect(listed.map((resource) => resource.id)).toEqual(['mine']);
  });

  it('fails when the listing fails', async () => {
    // arrange
    const server = serverWith([stored({})]);
    const failure = expect(server.listForClient('client-1', 'fails')).rejects.toThrow(
      RESOURCES_UNAVAILABLE,
    );

    // act
    await vi.advanceTimersByTimeAsync(RESOURCE_LATENCY_MS);

    // assert
    await failure;
  });
});

describe('the coach-wide tags', () => {
  it('come from every client’s resources', async () => {
    // arrange
    const server = serverWith([
      stored({ id: 'one', tags: ['Training'] }),
      stored({ id: 'two', clientId: 'c2', tags: ['Sleep'] }),
    ]);

    // act
    const tags = await settled(server.listTags());

    // assert
    expect(tags).toEqual(['Sleep', 'Training']);
  });

  it('lose a tag once the last resource holding it is deleted', async () => {
    // arrange
    const server = serverWith([
      stored({ id: 'one', tags: ['Training'] }),
      stored({ id: 'two', tags: ['Sleep'] }),
    ]);
    await settled(server.remove('two'));

    // act
    const tags = await settled(server.listTags());

    // assert
    expect(tags).toEqual(['Training']);
  });
});

describe('adding a resource', () => {
  const file = new File([new Uint8Array(4096)], 'meal-ideas.pdf', {
    type: 'application/pdf',
  });

  it('reports upload progress and lists the new resource first', async () => {
    // arrange
    const server = serverWith([stored({})]);
    const progress: number[] = [];
    const pending = server.add(
      {
        clientId: 'client-1',
        file,
        details: { title: 'Meal ideas', description: '', tags: [] },
      },
      { outcome: 'works', onProgress: (fraction) => progress.push(fraction) },
    );

    // act
    const added = await settled(pending, UPLOAD_TIME);
    const listed = await settled(server.listForClient('client-1', 'works'));

    // assert
    expect(progress).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
    expect(listed[0]).toEqual(added);
    expect(added).toMatchObject({
      title: 'Meal ideas',
      file: { name: 'meal-ideas.pdf', kind: 'pdf', sizeBytes: 4096 },
      pageImageUrls: ['p1', 'p2', 'p3'],
      addedAt: NOW,
      openedAt: null,
    });
  });

  it('keeps a Word file download-only, with no pages', async () => {
    // arrange
    const server = serverWith([]);
    const notes = new File([new Uint8Array(2048)], 'notes.docx');
    const pending = server.add(
      {
        clientId: 'client-1',
        file: notes,
        details: { title: 'Notes', description: '', tags: [] },
      },
      { outcome: 'works', onProgress: () => undefined },
    );

    // act
    const added = await settled(pending, UPLOAD_TIME);

    // assert
    expect(added.file).toEqual({ name: 'notes.docx', kind: 'word', sizeBytes: 2048 });
    expect(added.pageImageUrls).toEqual([]);
  });

  it('resolves a tag typed in other casing to the existing tag', async () => {
    // arrange
    const server = serverWith([stored({ clientId: 'c2', tags: ['Training'] })]);
    const pending = server.add(
      {
        clientId: 'client-1',
        file,
        details: { title: 'Meal ideas', description: '', tags: ['training'] },
      },
      { outcome: 'works', onProgress: () => undefined },
    );

    // act
    const added = await settled(pending, UPLOAD_TIME);

    // assert
    expect(added.tags).toEqual(['Training']);
  });

  it('keeps nothing when the upload fails', async () => {
    // arrange
    const server = serverWith([]);
    const pending = server.add(
      {
        clientId: 'client-1',
        file,
        details: { title: 'Meal ideas', description: '', tags: [] },
      },
      { outcome: 'fails', onProgress: () => undefined },
    );
    const failure = expect(pending).rejects.toThrow(UPLOAD_FAILED);

    // act
    await vi.advanceTimersByTimeAsync(UPLOAD_TIME);
    await failure;
    const listed = await settled(server.listForClient('client-1', 'works'));

    // assert
    expect(listed).toEqual([]);
  });
});

describe('changing a resource', () => {
  it('updates the title, description and tags and leaves the file alone', async () => {
    // arrange
    const original = stored({});
    const server = serverWith([original]);

    // act
    const updated = await settled(
      server.updateDetails(original.id, {
        title: 'Warm-up',
        description: '',
        tags: ['Glutes'],
      }),
    );

    // assert
    expect(updated).toEqual({
      ...original,
      title: 'Warm-up',
      description: '',
      tags: ['Glutes'],
    });
  });

  it('records the first time the client opens it', async () => {
    // arrange
    const server = serverWith([stored({})]);

    // act
    const opened = await settled(server.markOpened('warm-up'));

    // assert
    expect(opened.openedAt).toEqual(NOW);
  });
});

describe('downloading a resource', () => {
  it('hands back the uploaded file under its original name', async () => {
    // arrange
    const server = serverWith([]);
    const file = new File(['plate'], 'plate.png', { type: 'image/png' });
    const added = await settled(
      server.add(
        {
          clientId: 'client-1',
          file,
          details: { title: 'Plate', description: '', tags: [] },
        },
        { outcome: 'works', onProgress: () => undefined },
      ),
      UPLOAD_TIME,
    );

    // act
    const download = await server.download(added.id);

    // assert
    expect(download).toEqual({ blob: file, fileName: 'plate.png' });
  });

  it('hands back a placeholder named after the file when none was uploaded', async () => {
    // arrange
    const server = serverWith([stored({})]);

    // act
    const download = await server.download('warm-up');

    // assert
    expect(download.fileName).toBe('warm-up.pdf');
    expect(download.blob.size).toBeGreaterThan(0);
  });
});
