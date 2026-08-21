import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EmailPreview } from './EmailPreview';

// The iframe's title comes from the template list rather than from the render,
// so every assertion here reads srcdoc: that is the only evidence the chosen
// template actually reached the preview. The frame keeps serving the previous
// template's markup until the next render resolves, so the copy that tells the
// two apart has to be what the retry waits for — waiting for any markup at all
// is satisfied by the stale frame.
async function previewedEmail(title: string, distinguishingCopy: string) {
  const frame = await screen.findByTitle(title);
  let markup = '';
  await waitFor(() => {
    markup = frame.getAttribute('srcdoc') ?? '';
    expect(markup).toContain(distinguishingCopy);
  });
  return markup;
}

describe('EmailPreview', () => {
  it('previews the first client invitation through the preview surface', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Client invitation' }));

    // assert
    expect(
      screen.getByRole('button', { name: 'First invitation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Replaced invitation' }),
    ).toBeInTheDocument();
    const markup = await previewedEmail(
      'Client invitation — first',
      'starting targets',
    );
    expect(markup).toContain('Accept your invitation');
  });

  it('previews the replaced invitation when that variant is chosen', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);
    await user.click(screen.getByRole('button', { name: 'Client invitation' }));
    await previewedEmail('Client invitation — first', 'starting targets');

    // act
    await user.click(screen.getByRole('button', { name: 'Replaced invitation' }));

    // assert
    const markup = await previewedEmail(
      'Client invitation — replaced',
      'stopped working',
    );
    expect(markup).toContain('Accept your invitation');
  });
});
