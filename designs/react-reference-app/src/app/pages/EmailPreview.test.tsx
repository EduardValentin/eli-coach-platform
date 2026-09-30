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
  it('previews the client invitation through the preview surface', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Client invitation' }));

    // assert
    expect(
      screen.queryByRole('button', { name: 'Replaced invitation' }),
    ).not.toBeInTheDocument();
    const markup = await previewedEmail(
      'Client invitation — invitation',
      'place in my coaching is booked',
    );
    expect(markup).toContain('Create your account');
  });

  it('previews the request for more details', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Details request' }));

    // assert
    const markup = await previewedEmail(
      'Details request — request',
      'need a few more details before I build your program',
    );
    expect(markup).toContain('Answer now');
  });
});
