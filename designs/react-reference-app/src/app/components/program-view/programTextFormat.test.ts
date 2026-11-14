import { HeadingNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { $getRoot, createEditor } from 'lexical';
import { describe, expect, it } from 'vitest';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { programForSeed } from '../../services/programSamples';
import { templateText, type TemplateKey } from '../../domain/programTemplates';
import { PROGRAM_TEXT_FORMAT } from './programTextFormat';

const TEMPLATE_KEYS: TemplateKey[] = [
  'legend', 'warmUp', 'coolDown', 'progression', 'steps', 'missedDay', 'calibration', 'lowEnergy', 'noWeight',
  'block.foundation', 'block.hypertrophy', 'block.strength', 'block.deload', 'split.full-body', 'split.upper-lower',
];

function editorWith(text: string) {
  const editor = createEditor({ nodes: [HeadingNode, ListNode, ListItemNode], onError: error => { throw error; } });
  editor.update(() => PROGRAM_TEXT_FORMAT.read(text), { discrete: true });
  return editor;
}

function roundTrip(text: string): string {
  return editorWith(text).getEditorState().read(PROGRAM_TEXT_FORMAT.write);
}

function seededTexts(): string[] {
  return (['draft', 'published', 'two-versions'] as const).flatMap(seed => {
    const program = programForSeed(seed, { callId: 'ac-demo-client-1', dayOne: new Date(2026, 8, 16), equipment: [] }, SAMPLE_EXERCISES);
    return (program?.versions ?? []).flatMap(version => {
      const { header, nutritionNotes, lifestyleNotes, plan } = version.content;
      return [
        version.whatChanged, header.title, header.focus, header.personalNote, nutritionNotes, lifestyleNotes,
        ...plan.blocks.flatMap(block => [block.introText, block.clientNote, block.split.text, block.missedDayNote]),
      ];
    });
  });
}

describe('PROGRAM_TEXT_FORMAT', () => {
  it.each(TEMPLATE_KEYS)('opens and saves the %s standard text unchanged', key => {
    // arrange
    const { text } = templateText(key, 'en');

    // act
    const saved = roundTrip(text);

    // assert
    expect(saved).toBe(text);
  });

  it('opens and saves every seeded text unchanged', () => {
    // arrange
    const texts = seededTexts();

    // act
    const saved = texts.map(roundTrip);

    // assert
    expect(saved).toEqual(texts);
  });

  it('reads the bold first line as the heading and later bold lines as bold paragraphs', () => {
    // arrange / act
    const editor = editorWith('**Your split**\n**Tip:** rest a day\n**Only bold**');

    // assert
    const kinds = editor.getEditorState().read(() => $getRoot().getChildren().map(child => child.getType()));
    expect(kinds).toEqual(['heading', 'paragraph', 'paragraph']);
    expect(roundTrip('**Your split**\n**Tip:** rest a day\n**Only bold**')).toBe('**Your split**\n**Tip:** rest a day\n**Only bold**');
  });

  it('keeps dash lists, italics and characters the renderer prints literally', () => {
    // arrange
    const text = 'Before you start:\n— a *light* warm-up\n— ~30 min_easy\nThen `go`';

    // act
    const saved = roundTrip(text);

    // assert
    expect(saved).toBe(text);
    expect(editorWith(text).getEditorState().read(() => $getRoot().getChildren().map(child => child.getType()))).toEqual(['paragraph', 'list', 'paragraph']);
  });
});
