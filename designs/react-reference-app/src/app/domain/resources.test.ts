import { describe, expect, it } from 'vitest';
import {
  RESOURCE_MAX_BYTES,
  browseResources,
  checkResourceUpload,
  coachTagVocabulary,
  detailsDiffer,
  hasUnopenedResources,
  resourceDetailsFrom,
  tagCounts,
  titleFromFileName,
  type Resource,
} from './resources';

function resource(overrides: Partial<Resource>): Resource {
  return {
    id: 'r-1',
    clientId: 'client-1',
    title: 'Glute activation warm-up',
    description: '',
    tags: [],
    file: { name: 'warm-up.pdf', kind: 'pdf', sizeBytes: 1024, pageCount: 1 },
    pageImageUrls: ['page-1'],
    addedAt: new Date('2026-09-20T09:00:00.000Z'),
    openedAt: null,
    ...overrides,
  };
}

describe('checking an upload', () => {
  it.each([
    ['plan.pdf', 'pdf'],
    ['notes.DOCX', 'word'],
    ['notes.odt', 'word'],
    ['tracker.xlsx', 'excel'],
    ['tracker.ods', 'excel'],
    ['plate.jpeg', 'image'],
    ['plate.webp', 'image'],
  ])('accepts %s as a %s file', (name, kind) => {
    // arrange
    const candidate = { name, size: 1024 };

    // act
    const check = checkResourceUpload(candidate);

    // assert
    expect(check).toEqual({ accepted: true, kind });
  });

  it('refuses a file type it does not support', () => {
    // arrange
    const candidate = { name: 'clip.mp4', size: 1024 };

    // act
    const check = checkResourceUpload(candidate);

    // assert
    expect(check).toEqual({ accepted: false, refusal: 'unsupported-type' });
  });

  it('accepts a file of exactly 25 MB and refuses one byte more', () => {
    // arrange
    const atLimit = { name: 'plan.pdf', size: RESOURCE_MAX_BYTES };
    const overLimit = { name: 'plan.pdf', size: RESOURCE_MAX_BYTES + 1 };

    // act
    const checks = [atLimit, overLimit].map(checkResourceUpload);

    // assert
    expect(checks).toEqual([
      { accepted: true, kind: 'pdf' },
      { accepted: false, refusal: 'too-large' },
    ]);
  });
});

describe('titling a resource from its file name', () => {
  it('drops the extension and turns separators into spaces', () => {
    // arrange
    const fileName = 'luteal_phase-meal.ideas.docx';

    // act
    const title = titleFromFileName(fileName);

    // assert
    expect(title).toBe('Luteal phase meal ideas');
  });
});

describe('reading resource details', () => {
  it('requires a title', () => {
    // arrange
    const input = { title: '   ', description: '', tags: [] };

    // act
    const details = resourceDetailsFrom(input);

    // assert
    expect(details).toBeNull();
  });

  it('trims the text and holds each tag once', () => {
    // arrange
    const input = {
      title: ' Warm-up ',
      description: ' Before every session. ',
      tags: ['Training', 'training', 'Glutes'],
    };

    // act
    const details = resourceDetailsFrom(input);

    // assert
    expect(details).toEqual({
      title: 'Warm-up',
      description: 'Before every session.',
      tags: ['Training', 'Glutes'],
    });
  });

  it('notices when only the tag order changed', () => {
    // arrange
    const current = resource({ tags: ['Training', 'Glutes'] });

    // act
    const differs = detailsDiffer(current, {
      title: current.title,
      description: current.description,
      tags: ['Glutes', 'Training'],
    });

    // assert
    expect(differs).toBe(true);
  });
});

describe('the coach-wide tag vocabulary', () => {
  it('derives one sorted vocabulary from every client, keeping the oldest casing', () => {
    // arrange
    const resources = [
      resource({
        id: 'r-new',
        clientId: 'c2',
        tags: ['nutrition'],
        addedAt: new Date('2026-09-25T09:00:00.000Z'),
      }),
      resource({ id: 'r-old', tags: ['Nutrition', 'Training'] }),
    ];

    // act
    const vocabulary = coachTagVocabulary(resources);

    // assert
    expect(vocabulary).toEqual(['Nutrition', 'Training']);
  });

  it('forgets a tag once no resource uses it', () => {
    // arrange
    const resources = [
      resource({ id: 'kept', tags: ['Training'] }),
      resource({ id: 'deleted', tags: ['Sleep'] }),
    ];

    // act
    const vocabulary = coachTagVocabulary(
      resources.filter((item) => item.id !== 'deleted'),
    );

    // assert
    expect(vocabulary).toEqual(['Training']);
  });

  it('counts the resources holding each tag', () => {
    // arrange
    const resources = [
      resource({ id: 'r-1', tags: ['Training', 'Glutes'] }),
      resource({ id: 'r-2', tags: ['training'] }),
    ];

    // act
    const counts = tagCounts(resources);

    // assert
    expect(counts).toEqual([
      { tag: 'Glutes', count: 1 },
      { tag: 'Training', count: 2 },
    ]);
  });
});

describe('browsing resources', () => {
  const warmUp = resource({
    id: 'warm-up',
    title: 'Glute activation warm-up',
    tags: ['Training'],
    addedAt: new Date('2026-09-10T09:00:00.000Z'),
  });
  const meals = resource({
    id: 'meals',
    title: 'Luteal phase meal ideas',
    tags: ['Nutrition'],
    addedAt: new Date('2026-09-20T09:00:00.000Z'),
  });
  const tracker = resource({
    id: 'tracker',
    title: 'Weekly macro tracker',
    tags: ['Nutrition'],
    addedAt: new Date('2026-09-15T09:00:00.000Z'),
  });
  const all = [warmUp, meals, tracker];

  it('lists the newest first by default', () => {
    // arrange
    const filter = { tag: null, query: '' };

    // act
    const listed = browseResources(all, filter, {
      key: 'added',
      direction: 'desc',
    });

    // assert
    expect(listed.map((item) => item.id)).toEqual(['meals', 'tracker', 'warm-up']);
  });

  it('narrows to a tag and a partial, case-insensitive title match', () => {
    // arrange
    const filter = { tag: 'nutrition', query: 'MACRO' };

    // act
    const listed = browseResources(all, filter, {
      key: 'added',
      direction: 'desc',
    });

    // assert
    expect(listed.map((item) => item.id)).toEqual(['tracker']);
  });

  it('orders by title from Z to A once reversed', () => {
    // arrange
    const filter = { tag: null, query: '' };

    // act
    const listed = browseResources(all, filter, {
      key: 'title',
      direction: 'desc',
    });

    // assert
    expect(listed.map((item) => item.id)).toEqual(['tracker', 'meals', 'warm-up']);
  });
});

describe('unopened resources', () => {
  it('reports when any resource has not been opened yet', () => {
    // arrange
    const resources = [
      resource({ id: 'seen', openedAt: new Date() }),
      resource({ id: 'unseen', openedAt: null }),
    ];

    // act
    const unopened = hasUnopenedResources(resources);

    // assert
    expect(unopened).toBe(true);
  });
});
