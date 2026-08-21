import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EmailPreview } from './EmailPreview';

describe('EmailPreview', () => {
  it('previews the client invitation in both of the sends it has', async () => {
    // arrange
    render(<EmailPreview />);

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Client invitation' }),
    );

    // assert
    expect(
      await screen.findByTitle('Client invitation — first'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'First invitation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Replaced invitation' }),
    ).toBeInTheDocument();
  });

  it('renders the replaced send when that variant is chosen', async () => {
    // arrange
    render(<EmailPreview />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Client invitation' }),
    );

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Replaced invitation' }),
    );

    // assert
    expect(
      await screen.findByTitle('Client invitation — replaced'),
    ).toBeInTheDocument();
  });
});
