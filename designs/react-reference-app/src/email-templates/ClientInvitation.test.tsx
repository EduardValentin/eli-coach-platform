import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ClientInvitation,
  type ClientInvitationProps,
} from './ClientInvitation';

const ACCEPT_URL = 'https://evoa.fit/invitation#inv-1';
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
  it('offers one primary action to create the account, naming the coach and the 30-day validity', async () => {
    // arrange
    const props: ClientInvitationProps = {};

    // act
    await mountInvitation(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your place is booked.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // The accept link is the only destination in the email that is not a way
    // to reach Eli, so a second call to action cannot slip in unnoticed.
    expect(linkTargets()).toEqual([ACCEPT_URL, CONTACT_HREF, CONTACT_HREF]);
    expect(
      screen.getByRole('link', { name: 'Create your account' }),
    ).toHaveAttribute('href', ACCEPT_URL);
    expect(screen.getByText('— Eli')).toBeInTheDocument();
    expect(screen.getByText(/works for the next 30 days/i)).toBeInTheDocument();
    expect(
      screen.getByText(/have to create your account from it/i),
    ).toBeInTheDocument();
  });

  it('tells a paying client her place is booked and what comes after the account', async () => {
    // arrange
    const props: ClientInvitationProps = {};

    // act
    await mountInvitation(props);

    // assert
    expect(screen.getByText("Let's get you set up.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Thank you — your place in my coaching is booked. Create your account from the button below; it takes a minute. Then you'll answer a short form about you, and I'll build your program from your answers.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This link works for the next 30 days. You have to create your account from it — reading this email isn't enough. If it runs out, tell me and I'll send you a new one.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Create your account from the button above.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Answer a short form about your goals, your health and your day-to-day.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "I build your program, and you'll find it right here in your account.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/five minutes/i)).not.toBeInTheDocument();
  });

  it('links the preview to the invitation page with the token in the fragment', async () => {
    // arrange
    const props: ClientInvitationProps = { acceptUrl: undefined };

    // act
    await mountInvitation(props);

    // assert
    expect(
      screen.getByRole('link', { name: 'Create your account' }),
    ).toHaveAttribute('href', '/invitation#inv-demo');
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

  it('declares language, direction and the subject line', async () => {
    // arrange
    const props: ClientInvitationProps = {};

    // act
    const parsed = await mountInvitation(props);

    // assert
    // Read through the DOM directly: jest-dom's element matchers reject
    // nodes from a DOMParser document, which has no defaultView.
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
    expect(parsed.title).toBe('Your place is booked — create your account.');
  });
});
