import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ClientInvitation,
  type ClientInvitationProps,
} from './ClientInvitation';

const ACCEPT_URL = 'https://evoa.fit/portal/onboarding';
const CONTACT_HREF = 'mailto:contact@evoa.fit';

// The template renders a whole document, so it is rendered the way the preview
// surface renders it — through @react-email/render — and the resulting markup
// is then mounted so queries run against the accessibility tree a mail client
// would build. Document-level attributes are read from the parsed document,
// which mounting cannot carry.
async function mountInvitation(props: ClientInvitationProps) {
  const html = await renderEmail(
    <ClientInvitation acceptUrl={ACCEPT_URL} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

function linkTargets() {
  return screen.getAllByRole('link').map((link) => link.getAttribute('href'));
}

describe('ClientInvitation', () => {
  it('offers one primary action to accept, naming the coach and the 30-day validity', async () => {
    // arrange
    const props: ClientInvitationProps = { variant: 'first' };

    // act
    await mountInvitation(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: /you're all set up/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // The accept link is the only destination in the email that is not a way
    // to reach Eli, so a second call to action cannot slip in unnoticed.
    expect(linkTargets()).toEqual([ACCEPT_URL, CONTACT_HREF, CONTACT_HREF]);
    expect(
      screen.getByRole('link', { name: 'Accept your invitation' }),
    ).toHaveAttribute('href', ACCEPT_URL);
    expect(screen.getByText('— Eli')).toBeInTheDocument();
    expect(screen.getByText(/works for the next 30 days/i)).toBeInTheDocument();
  });

  it('tells a re-invited client that the earlier link stopped working', async () => {
    // arrange
    const props: ClientInvitationProps = { variant: 'replaced' };

    // act
    await mountInvitation(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: /here's your new link/i }),
    ).toBeInTheDocument();
    expect(linkTargets()).toEqual([ACCEPT_URL, CONTACT_HREF, CONTACT_HREF]);
    expect(screen.getByText(/no longer works/i)).toBeInTheDocument();
    expect(screen.getByText(/works for the next 30 days/i)).toBeInTheDocument();
  });

  it('addresses the client and signs off as the coach it was given', async () => {
    // arrange
    const props: ClientInvitationProps = {
      clientName: 'Sofia',
      coachName: 'Marta',
    };

    // act
    await mountInvitation(props);

    // assert
    expect(screen.getByText('Hi Sofia,')).toBeInTheDocument();
    expect(screen.getByText('— Marta')).toBeInTheDocument();
    expect(screen.queryByText('Hi Jane,')).not.toBeInTheDocument();
  });

  // The title carries the subject line, so asserting it per variant is what
  // catches a send wired to the wrong copy.
  it.each([
    ['first', 'Your targets are ready — accept your invitation.'],
    ['replaced', 'A fresh invitation link — use this one instead.'],
  ] as const)(
    'declares language, direction and the %s send’s subject line',
    async (variant, subject) => {
      // arrange
      const props: ClientInvitationProps = { variant };

      // act
      const parsed = await mountInvitation(props);

      // assert
      // Read through the DOM directly: jest-dom's element matchers reject
      // nodes from a DOMParser document, which has no defaultView.
      expect(parsed.documentElement.getAttribute('lang')).toBe('en');
      expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
      expect(parsed.title).toBe(subject);
    },
  );
});
