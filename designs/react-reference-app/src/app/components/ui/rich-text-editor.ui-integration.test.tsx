import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PROGRAM_TEXT_FORMAT } from '../program-view/programTextFormat';
import { RichTextEditor, type RichTextEditorHandle } from './rich-text-editor';

const THEME = { root: '', heading: '', list: '', bold: '', italic: '' };

function renderEditor(initial: string, onEscape = vi.fn()) {
  const handle = createRef<RichTextEditorHandle>();
  const saved: string[] = [];
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <RichTextEditor
        ref={handle}
        label="Split text"
        placeholder="How her week is split"
        value={value}
        format={PROGRAM_TEXT_FORMAT}
        theme={THEME}
        tools={['heading', 'bold', 'italic', 'list']}
        onChange={text => {
          saved.push(text);
          setValue(text);
        }}
        onEscape={onEscape}
      />
    );
  }
  render(<Harness />);
  return { user: userEvent.setup(), handle, saved, onEscape };
}

async function focusAtEnd(handle: React.RefObject<RichTextEditorHandle | null>) {
  await act(async () => handle.current?.focus());
}

describe('RichTextEditor', () => {
  it('is a labelled text box that shows the stored text without markup', () => {
    // arrange / act
    renderEditor('**Your split**\n**Tip:** rest a day');

    // assert
    const box = screen.getByRole('textbox', { name: 'Split text' });
    expect(box).toHaveTextContent('Your splitTip: rest a day');
    expect(box).not.toHaveTextContent('**');
    expect(screen.getByRole('heading', { name: 'Your split' })).toBeInTheDocument();
  });

  it('turns the first line into the heading and the current line into a list from the toolbar', async () => {
    // arrange
    const { user, handle, saved } = renderEditor('Your split\nTwice a week');
    await focusAtEnd(handle);

    // act
    await user.click(screen.getByRole('button', { name: 'Heading' }));

    // assert
    expect(saved.at(-1)).toBe('**Your split**\nTwice a week');
    expect(screen.getByRole('button', { name: 'Heading' })).toHaveAttribute('aria-pressed', 'true');

    // act
    await user.click(screen.getByRole('button', { name: 'Bulleted list' }));

    // assert
    expect(saved.at(-1)).toBe('**Your split**\n— Twice a week');
    expect(screen.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('formats with the keyboard shortcuts, keeping bold and italic apart', async () => {
    // arrange
    const { user, handle, saved } = renderEditor('Twice a week');
    await focusAtEnd(handle);

    // act
    await user.keyboard('{Control>}b{/Control}');

    // assert
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');

    // act
    await user.keyboard('{Control>}i{/Control}');

    // assert
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false');

    // act
    await user.keyboard('{Control>}{Shift>}8{/Shift}{/Control}');

    // assert
    expect(saved.at(-1)).toBe('— Twice a week');

    // act
    await user.keyboard('{Control>}{Alt>}1{/Alt}{/Control}');

    // assert
    expect(screen.getByRole('button', { name: 'Heading' })).toBeDisabled();
  });

  it('finishes on Escape', async () => {
    // arrange
    const { user, handle, onEscape } = renderEditor('Twice a week');
    await focusAtEnd(handle);

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('saves nothing just by opening a stored text', async () => {
    // arrange
    const { handle, saved } = renderEditor('**Your split: Full Body, 3x per week**\nEvery session trains your whole body.\n**Tip:** leave at least one rest day.');

    // act
    await focusAtEnd(handle);

    // assert
    expect(saved).toEqual([]);
  });
});
