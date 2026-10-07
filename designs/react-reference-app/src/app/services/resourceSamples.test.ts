import { describe, expect, it } from 'vitest';
import {
  coachTagVocabulary,
  hasPagePreview,
  hasUnopenedResources,
} from '../domain/resources';
import { AWAITING_REVIEW_CALL_ID } from '../context/ClientJourneyContext';
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

  it('cover every file kind and give pages only to PDFs and images', () => {
    // arrange
    const resources = sampleResources(NOW);

    // act
    const kinds = new Set(resources.map((resource) => resource.file.kind));
    const pagesMatchTheirKind = resources.every(
      (resource) => (resource.pageImageUrls.length > 0) === hasPagePreview(resource.file.kind),
    );

    // assert
    expect([...kinds].sort()).toEqual(['excel', 'image', 'pdf', 'word']);
    expect(pagesMatchTheirKind).toBe(true);
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

describe('the seeded resources of the client in onboarding', () => {
  it('give the client the coach list opens on her record something to show', () => {
    // arrange
    const resources = sampleResources(NOW);

    // act
    const hers = resources.filter((resource) => resource.clientId === AWAITING_REVIEW_CALL_ID);

    // assert
    expect(hers.length).toBeGreaterThan(0);
  });
});
