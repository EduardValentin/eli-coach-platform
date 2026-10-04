import { describe, expect, it } from 'vitest';
import { coachTagVocabulary, hasUnopenedResources } from '../domain/resources';
import { sampleResources } from './resourceSamples';

const NOW = new Date('2026-10-03T09:00:00.000Z');

describe('the seeded resources', () => {
  it('leave something unopened for the signed-in client', () => {
    // arrange
    const resources = sampleResources(NOW);

    // act
    const unopened = hasUnopenedResources(
      resources.filter((resource) => resource.clientId === 'client-1'),
    );

    // assert
    expect(unopened).toBe(true);
  });

  it('cover every file kind with one page image per page', () => {
    // arrange
    const resources = sampleResources(NOW);

    // act
    const kinds = new Set(resources.map((resource) => resource.file.kind));
    const pagesMatch = resources.every(
      (resource) => resource.pageImageUrls.length === resource.file.pageCount,
    );

    // assert
    expect([...kinds].sort()).toEqual(['excel', 'image', 'pdf', 'word']);
    expect(pagesMatch).toBe(true);
  });

  it('reuse tags across clients from one vocabulary', () => {
    // arrange
    const resources = sampleResources(NOW);
    const ofClient = (clientId: string) =>
      coachTagVocabulary(resources.filter((resource) => resource.clientId === clientId));

    // act
    const shared = ofClient('client-1').filter((tag) => ofClient('c2').includes(tag));

    // assert
    expect(shared).toEqual(expect.arrayContaining(['Nutrition', 'Training']));
  });
});
