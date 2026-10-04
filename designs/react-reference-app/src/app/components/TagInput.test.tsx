import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TagInput } from './TagInput';

const VOCABULARY = ['Cycle', 'Nutrition', 'Tracking', 'Training'];

function TagField({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState<string[]>(initial);

  return (
    <>
      <label htmlFor="tags">Tags</label>
      <TagInput id="tags" onChange={setTags} value={tags} vocabulary={VOCABULARY} />
    </>
  );
}

function chosenTags(): string[] {
  const list = screen.queryByRole('list', { name: 'Chosen tags' });
  if (!list) return [];

  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '');
}

function suggestionNames(): string[] {
  return screen.getAllByRole('option').map((option) => option.textContent ?? '');
}

describe('TagInput', () => {
  it('suggests existing tags that contain the typed text, ignoring case and chosen tags', async () => {
    // arrange
    render(<TagField initial={['Training']} />);

    // act
    await userEvent.type(screen.getByRole('combobox', { name: 'Tags' }), 'TR');

    // assert
    expect(suggestionNames()).toEqual(['Tracking', 'Nutrition', 'Create “TR”']);
  });

  it('offers no new tag when the text already names one in other casing', async () => {
    // arrange
    render(<TagField />);

    // act
    await userEvent.type(screen.getByRole('combobox', { name: 'Tags' }), 'nutrition');

    // assert
    expect(suggestionNames()).toEqual(['Nutrition']);
  });

  it('commits the existing tag when its name is typed in other casing', async () => {
    // arrange
    render(<TagField />);
    const field = screen.getByRole('combobox', { name: 'Tags' });

    // act
    await userEvent.type(field, 'cycle,');

    // assert
    expect(chosenTags()).toEqual(['Cycle']);
  });

  it('creates a new tag from the Create option', async () => {
    // arrange
    render(<TagField />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Tags' }), 'Mobility');

    // act
    await userEvent.click(screen.getByRole('option', { name: 'Create “Mobility”' }));

    // assert
    expect(chosenTags()).toEqual(['Mobility']);
  });

  it('never holds the same tag twice', async () => {
    // arrange
    render(<TagField initial={['Training']} />);
    const field = screen.getByRole('combobox', { name: 'Tags' });

    // act
    await userEvent.type(field, 'training{Enter}');

    // assert
    expect(chosenTags()).toEqual(['Training']);
  });

  it('picks the highlighted suggestion with the arrow keys and Enter', async () => {
    // arrange
    render(<TagField />);
    const field = screen.getByRole('combobox', { name: 'Tags' });
    await userEvent.type(field, 'tr');

    // act
    await userEvent.keyboard('{ArrowDown}{Enter}');

    // assert
    expect(chosenTags()).toEqual(['Training']);
  });

  it('removes the last tag with Backspace on an empty field', async () => {
    // arrange
    render(<TagField initial={['Cycle', 'Nutrition']} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Tags' }));

    // act
    await userEvent.keyboard('{Backspace}');

    // assert
    expect(chosenTags()).toEqual(['Cycle']);
  });

  it('removes a tag from its own labelled button', async () => {
    // arrange
    render(<TagField initial={['Cycle', 'Nutrition']} />);

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Remove Cycle' }));

    // assert
    expect(chosenTags()).toEqual(['Nutrition']);
  });

  it('reports whether its suggestions are showing', async () => {
    // arrange
    render(<TagField />);
    const field = screen.getByRole('combobox', { name: 'Tags' });
    await userEvent.type(field, 'cy');

    // act
    await userEvent.keyboard('{Escape}');

    // assert
    expect(field).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
