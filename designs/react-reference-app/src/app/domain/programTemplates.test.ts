import { describe, expect, it } from 'vitest';
import { fillTemplate, templateText, type TemplateKey } from './programTemplates';

const KEYS: TemplateKey[] = [
  'legend', 'warmUp', 'coolDown', 'progression', 'steps', 'missedDay', 'calibration',
  'block.foundation', 'block.hypertrophy', 'block.strength', 'block.deload',
  'split.full-body', 'split.upper-lower', 'lowEnergy',
];

describe('templateText', () => {
  it('returns the English text as final', () => {
    const template = templateText('block.hypertrophy', 'en');

    expect(template.text).toMatch(/^\*\*Building muscle/);
    expect(template.pending).toBe(false);
  });

  it('falls back to English and marks Romanian as pending', () => {
    const template = templateText('legend', 'ro');

    expect(template.text).toBe(templateText('legend', 'en').text);
    expect(template.pending).toBe(true);
  });

  it.each(KEYS)('has a non-empty English text for %s', key => {
    expect(templateText(key, 'en').text.length).toBeGreaterThan(0);
  });

  it('keeps the bold first line of a block text', () => {
    expect(templateText('block.foundation', 'en').text).toMatch(/^\*\*Building your base/);
  });
});

describe('fillTemplate', () => {
  it('replaces the frequency placeholder with a number', () => {
    expect(fillTemplate('Full Body, [2–3]x per week', { days: 3 })).toBe('Full Body, 3x per week');
  });

  it('keeps a placeholder with no value', () => {
    expect(fillTemplate('Full Body, [2–3]x per week', {})).toBe('Full Body, [2–3]x per week');
  });
});
