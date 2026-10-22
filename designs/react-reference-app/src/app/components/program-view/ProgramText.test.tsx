import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseTemplate, ProgramText } from './ProgramText';

const CYCLE = `**Listening to your cycle**
Your program is built around how *you* feel.
— keep the session, or
— swap it for your **Low-energy session** below.
None of these are "skipping".`;

describe('parseTemplate', () => {
  it('takes the first bold line as the title and every other line as a paragraph', () => {
    // act
    const parsed = parseTemplate(CYCLE);

    // assert
    expect(parsed.title).toBe('Listening to your cycle');
    expect(parsed.paragraphs.map(paragraph => paragraph.body)).toEqual([
      'Your program is built around how *you* feel.',
      '— keep the session, or',
      '— swap it for your **Low-energy session** below.',
      'None of these are "skipping".',
    ]);
  });

  it('splits a paragraph that opens with a bold run into its lead and body', () => {
    // arrange
    const text = `**Strength block**\n**How it should feel:** heavy but technically clean.`;

    // act
    const parsed = parseTemplate(text);

    // assert
    expect(parsed.paragraphs).toEqual([{ lead: 'How it should feel:', body: 'heavy but technically clean.' }]);
  });

  it('leaves the title empty when the text has no bold first line', () => {
    // act
    const parsed = parseTemplate('If you miss a session, continue with the next one.\n\nDo not double up.');

    // assert
    expect(parsed).toEqual({
      title: '',
      paragraphs: [{ body: 'If you miss a session, continue with the next one.' }, { body: 'Do not double up.' }],
    });
  });
});

describe('ProgramText', () => {
  it('renders the title as a heading, dash lines as a list and emphasis inline', () => {
    // act
    render(<ProgramText text={CYCLE} />);

    // assert
    const article = screen.getByRole('article', { name: 'Listening to your cycle' });
    expect(within(article).getByRole('heading', { level: 3, name: 'Listening to your cycle' })).toBeInTheDocument();
    const items = within(within(article).getByRole('list')).getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual(['keep the session, or', 'swap it for your Low-energy session below.']);
    expect(within(article).getByText('you').tagName).toBe('EM');
  });

  it('sets the lead of a paragraph apart from its body', () => {
    // act
    render(<ProgramText text={`**Deload week**\n**How it should feel:** easy.`} />);

    // assert
    expect(screen.getByText('How it should feel:')).toHaveClass('font-semibold');
    expect(screen.getByText('How it should feel:').closest('p')).toHaveTextContent('How it should feel: easy.');
  });
});
