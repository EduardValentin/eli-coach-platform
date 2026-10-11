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

  it('previews the coach refund email', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Refund due — coach' }));

    // assert
    const markup = await previewedEmail(
      'Refund due — coach — full-refund',
      'Full refund: cancelled within the 14-day withdrawal period.',
    );
    expect(markup).toContain('A refund is due.');
  });

  it('previews the check-in request to the coach with and without a note', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in requested' }));

    // assert
    const withNote = await previewedEmail(
      'Check-in requested — with-note',
      '>NOTE<',
    );
    expect(withNote).toContain('Review the request');
    expect(withNote).toContain('/coach/checkins');

    // act
    await user.click(screen.getByRole('button', { name: 'Without a note' }));

    // assert
    const frame = await screen.findByTitle('Check-in requested — without-note');
    await waitFor(() => {
      expect(frame.getAttribute('srcdoc') ?? '').toContain(
        'A new check-in request.',
      );
      expect(frame.getAttribute('srcdoc') ?? '').not.toContain('>NOTE<');
    });
  });

  it('samples a check-in at 6 PM on a weekday inside the coach hours', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in withdrawn' }));

    // assert
    const markup = await previewedEmail('Check-in withdrawn — withdrawn', 'Europe/Bucharest');
    expect(markup).toMatch(/(Monday|Tuesday|Wednesday|Thursday|Friday), \d{1,2} \w+ \d{4} at 6:00\s?PM/);
  });

  it('previews the withdrawn check-in to the coach', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in withdrawn' }));

    // assert
    const markup = await previewedEmail(
      'Check-in withdrawn — withdrawn',
      'That hour is free again.',
    );
    expect(markup).toContain('A request was withdrawn.');
  });

  it('previews the approved check-in with its join link', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in approved' }));

    // assert
    const markup = await previewedEmail(
      'Check-in approved — approved',
      'Use the button to join when it is time.',
    );
    expect(markup).toContain('Join Meet');
    expect(markup).toContain('/client/checkins/ci-demo/join');
    expect(markup).toContain('Add to Google Calendar');
    expect(markup).toContain('text=Check-in+with+Eli');
  });

  it('previews the declined check-in', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in declined' }));

    // assert
    const markup = await previewedEmail(
      'Check-in declined — declined',
      'You can pick another time on your Check-ins page.',
    );
    expect(markup).toContain('Pick another time');
    expect(markup).toContain('/client/checkins');
  });

  it('previews the check-in the coach scheduled to the client with and without a note', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in scheduled' }));

    // assert
    const withNote = await previewedEmail('Check-in scheduled — with-note', 'A check-in with Eli.');
    expect(withNote).toContain('>NOTE<');
    expect(withNote).toContain('Europe/London');
    expect(withNote).toContain('Answer the request');
    expect(withNote).toContain('/portal/checkins');

    // act
    await user.click(screen.getByRole('button', { name: 'Without a note' }));

    // assert
    const frame = await screen.findByTitle('Check-in scheduled — without-note');
    await waitFor(() => {
      expect(frame.getAttribute('srcdoc') ?? '').toContain('A check-in with Eli.');
      expect(frame.getAttribute('srcdoc') ?? '').not.toContain('>NOTE<');
    });
  });

  it('previews the cancelled check-in request to the client', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in request cancelled' }));

    // assert
    const markup = await previewedEmail(
      'Check-in request cancelled — cancelled',
      'No check-in is planned for that hour.',
    );
    expect(markup).toContain('Eli cancelled the check-in request.');
    expect(markup).toContain('Europe/London');
  });

  it('previews the client approval to the coach with her join link', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in approved — coach' }));

    // assert
    const markup = await previewedEmail(
      'Check-in approved — coach — approved',
      'Here is who approved it and when.',
    );
    expect(markup).toContain('Join Meet');
    expect(markup).toContain('/coach/checkins/ci-demo/join');
    expect(markup).toContain('Add to Google Calendar');
    expect(markup).toContain('text=Check-in+with+Jane+Doe');
    expect(markup).toContain('Europe/Bucharest');
  });

  it('previews the client decline to the coach', async () => {
    // arrange
    const user = userEvent.setup();
    render(<EmailPreview />);

    // act
    await user.click(screen.getByRole('button', { name: 'Check-in declined — coach' }));

    // assert
    const markup = await previewedEmail(
      'Check-in declined — coach — declined',
      'Your check-in was declined.',
    );
    expect(markup).toContain('That hour is free again.');
    expect(markup).toContain('Europe/Bucharest');
  });
});
