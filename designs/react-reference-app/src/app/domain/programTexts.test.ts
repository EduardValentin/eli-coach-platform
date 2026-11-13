import { describe, expect, it } from 'vitest';
import { programForSeed } from '../services/programSamples';
import { SAMPLE_EXERCISES } from '../services/exerciseSamples';
import { currentVersion, type ProgramVersion } from './program';
import { GUIDE_TEXT_KEYS, templateText } from './programTemplates';
import { blockTexts, isCustomised, isWritten, printedTitle, programText, programWideTexts, textProgress, versionWithStandardText, versionWithText, type ProgramTextTarget } from './programTexts';

function publishedVersion(): ProgramVersion {
  const program = programForSeed('published', { callId: 'ac-demo-client-1', dayOne: new Date(2026, 8, 16), equipment: [] }, SAMPLE_EXERCISES);
  const version = program && currentVersion(program);
  if (!version) throw new Error('seed missing');
  return version;
}

const LEGEND: ProgramTextTarget = { kind: 'guide', key: 'legend' };

describe('programText', () => {
  it('reads an optional version text with no standard', () => {
    // arrange
    const version = publishedVersion();

    // act
    const focus = programText(version, { kind: 'version', key: 'focus' }, 'en');

    // assert
    expect(focus).toMatchObject({ name: 'Focus until the next check-in', value: '', standard: null });
  });

  it('reads a guide text as its standard until the coach changes it', () => {
    // arrange
    const version = publishedVersion();

    // act
    const legend = programText(version, LEGEND, 'en');
    const changed = programText(versionWithText(version, LEGEND, 'Read top to bottom.'), LEGEND, 'en');

    // assert
    expect(isCustomised(legend)).toBe(false);
    expect(changed.value).toBe('Read top to bottom.');
    expect(isCustomised(changed)).toBe(true);
  });

  it('resets a block text to its standard text', () => {
    // arrange
    const version = publishedVersion();
    const block = version.content.plan.blocks[0];
    const intro: ProgramTextTarget = { kind: 'block', blockId: block.id, key: 'intro' };
    const changed = versionWithText(version, intro, 'My own intro');

    // act
    const reset = versionWithStandardText(changed, intro, 'en');

    // assert
    expect(reset.content.plan.blocks[0].introText).toBe(templateText(`block.${block.type}`, 'en').text);
  });

  it('writes what changed on the version, outside its content', () => {
    // arrange
    const version = publishedVersion();

    // act
    const next = versionWithText(version, { kind: 'version', key: 'whatChanged' }, 'Raised the steps');

    // assert
    expect(next.whatChanged).toBe('Raised the steps');
    expect(next.content).toBe(version.content);
  });
});

describe('omission', () => {
  it('counts only non-blank text as written', () => {
    expect(isWritten('  \n ')).toBe(false);
    expect(isWritten('Own the squat')).toBe(true);
  });

  it('prints a standard title when the coach leaves it blank', () => {
    // arrange
    const { content } = publishedVersion();

    // act
    const title = printedTitle({ ...content, header: { ...content.header, title: ' ' } });

    // assert
    expect(title).toBe('Training program');
  });
});

describe('guide texts', () => {
  it('no longer carries a rest-day or hard-cardio-swap text', () => {
    expect(GUIDE_TEXT_KEYS).not.toContain('restDay');
    expect(GUIDE_TEXT_KEYS).not.toContain('hiitAside');
  });
});

describe('textProgress', () => {
  it('counts standard texts as written and empty optional texts as not', () => {
    // arrange
    const version = publishedVersion();
    const block = { ...version.content.plan.blocks[0], calibrationWeek: false, clientNote: '' };

    // act
    const progress = textProgress(version, blockTexts(block), 'en');

    // assert
    expect(progress).toEqual({ written: progress.total - 1, total: blockTexts(block).length });
  });

  it('asks what changed only from version 2', () => {
    // arrange
    const version = publishedVersion();

    // act
    const first = programWideTexts(version);
    const second = programWideTexts({ ...version, number: 2 });

    // assert
    expect(first).not.toContainEqual({ kind: 'version', key: 'whatChanged' });
    expect(second).toContainEqual({ kind: 'version', key: 'whatChanged' });
  });
});
