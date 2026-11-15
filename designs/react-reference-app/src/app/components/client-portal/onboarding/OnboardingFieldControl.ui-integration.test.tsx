import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { OnboardingField } from '../../../domain/onboardingSchema';
import { UnitPreferencesProvider } from '../../../context/UnitPreferencesContext';
import { Form } from '../../ui/form';
import { OnboardingFieldControl } from './OnboardingFieldControl';
import type { OnboardingValues } from './onboardingValues';

const EQUIPMENT: OnboardingField = {
  id: 'equipment',
  label: 'Equipment',
  kind: 'chips',
  requirement: 'required',
  options: [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbells', label: 'Dumbbells' },
  ],
};

const LEVEL: OnboardingField = {
  id: 'level',
  label: 'Level',
  kind: 'select',
  requirement: 'required',
  options: [
    { value: 'beginner', label: 'Beginner' },
    { value: 'advanced', label: 'Advanced' },
  ],
};

const SPLIT: OnboardingField = {
  id: 'split',
  label: 'Split',
  kind: 'radio',
  requirement: 'required',
  options: [
    { value: 'full-body', label: 'Full Body' },
    { value: 'upper-lower', label: 'Upper / Lower' },
  ],
};

function SetupForm({ fields }: { fields: OnboardingField[] }) {
  const form = useForm<OnboardingValues>({ defaultValues: { equipment: [], level: '', split: '' } });

  return (
    <UnitPreferencesProvider>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(() => {})}>
          {fields.map((field) => (
            <OnboardingFieldControl key={field.id} control={form.control} field={field} />
          ))}
          <button type="submit">Save</button>
        </form>
      </Form>
    </UnitPreferencesProvider>
  );
}

describe('OnboardingFieldControl on an invalid submit', () => {
  it('moves focus to the first chip of an empty chip group and announces its error', async () => {
    // arrange
    const user = userEvent.setup();
    render(<SetupForm fields={[EQUIPMENT, LEVEL]} />);

    // act
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // assert
    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: 'Barbell' })).toHaveFocus();
  });

  it('moves focus to an empty select trigger when it is the first invalid field', async () => {
    // arrange
    const user = userEvent.setup();
    render(<SetupForm fields={[LEVEL, EQUIPMENT]} />);

    // act
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // assert
    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.getByRole('combobox')).toHaveFocus();
  });

  it('moves focus into an unanswered segmented choice when it is the first invalid field', async () => {
    // arrange
    const user = userEvent.setup();
    render(<SetupForm fields={[SPLIT, EQUIPMENT]} />);

    // act
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // assert
    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Full Body' })).toHaveFocus();
  });
});
