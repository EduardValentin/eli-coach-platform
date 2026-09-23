import { describe, expect, it } from 'vitest';
import type { OnboardingField } from '../../../domain/onboardingSchema';
import type { MeasureUnits } from '../measureUnits';
import {
  toAnswers,
  visibleFields,
  type OnboardingValues,
} from './onboardingValues';

const UNITS: MeasureUnits = { weight: 'kg', length: 'cm' };

const REVEALED_FIELD: OnboardingField = {
  id: 'detail',
  label: 'Detail',
  kind: 'text',
  requirement: 'optional',
  revealedBy: { id: 'trigger', value: 'yes' },
};

const CONCEALED_FIELD: OnboardingField = {
  id: 'length',
  label: 'Length',
  kind: 'number',
  requirement: 'optional',
  concealedBy: { id: 'lengthUnknown', value: 'true' },
};

const REQUIRED_FIELDS_FIELD: OnboardingField = {
  id: 'refinement',
  label: 'Refinement',
  kind: 'text',
  requirement: 'optional',
  requires: ['contraception', 'lifeStage'],
};

const TRIGGER_FIELD: OnboardingField = {
  id: 'trigger',
  label: 'Trigger',
  kind: 'radio',
  requirement: 'required',
};

describe('visibleFields', () => {
  it('hides a field once its concealedBy condition matches', () => {
    // arrange
    const fields = [CONCEALED_FIELD];

    // act
    const hidden = visibleFields(fields, { lengthUnknown: 'true' });
    const shown = visibleFields(fields, { lengthUnknown: 'false' });

    // assert
    expect(hidden).toEqual([]);
    expect(shown).toEqual([CONCEALED_FIELD]);
  });

  it('keeps a revealedBy field hidden until its condition matches', () => {
    // arrange
    const fields = [REVEALED_FIELD];

    // act
    const hidden = visibleFields(fields, { trigger: 'no' });
    const shown = visibleFields(fields, { trigger: 'yes' });

    // assert
    expect(hidden).toEqual([]);
    expect(shown).toEqual([REVEALED_FIELD]);
  });

  it('hides a field with requires until every listed field is answered', () => {
    // arrange
    const fields = [REQUIRED_FIELDS_FIELD];

    // act
    const noneAnswered = visibleFields(fields, {});
    const partlyAnswered = visibleFields(fields, { contraception: 'None' });
    const fullyAnswered = visibleFields(fields, {
      contraception: 'None',
      lifeStage: ['None of these'],
    });

    // assert
    expect(noneAnswered).toEqual([]);
    expect(partlyAnswered).toEqual([]);
    expect(fullyAnswered).toEqual([REQUIRED_FIELDS_FIELD]);
  });

  it('never lands a value for a field that is not currently visible', () => {
    // arrange
    const fields = [TRIGGER_FIELD, CONCEALED_FIELD];
    const values: OnboardingValues = {
      trigger: 'yes',
      lengthUnknown: 'true',
      length: '28',
    };

    // act
    const shown = visibleFields(fields, values);
    const answers = toAnswers(shown, values, UNITS);

    // assert
    expect(answers).not.toHaveProperty('length');
  });
});
