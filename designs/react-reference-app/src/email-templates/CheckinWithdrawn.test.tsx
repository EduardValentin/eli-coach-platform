import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinWithdrawn,
  type CheckinWithdrawnProps,
} from './CheckinWithdrawn';

const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const COACH_ZONE = 'Europe/Bucharest';

async function mountWithdrawn(props: CheckinWithdrawnProps = {}) {
  const html = await renderEmail(
    <CheckinWithdrawn
      startsAt={STARTS_AT}
      coachTimeZone={COACH_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinWithdrawn', () => {
  it('names who withdrew in its subject', async () => {
    // arrange
    const props: CheckinWithdrawnProps = { clientName: 'Sofia Marin' };

    // act
    const parsed = await mountWithdrawn(props);

    // assert
    expect(parsed.title).toBe('Sofia Marin withdrew the check-in request');
  });

  it('says which hour she withdrew, in the coach zone, and that it is free again', async () => {
    // arrange
    const props: CheckinWithdrawnProps = { clientName: 'Sofia Marin' };

    // act
    await mountWithdrawn(props);

    // assert
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'A request was withdrawn.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sofia Marin withdrew the check-in request.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 5:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Europe\/Bucharest \(GMT\+3\)/),
    ).toBeInTheDocument();
    expect(screen.getByText('That hour is free again.')).toBeInTheDocument();
  });

  it('carries no button', async () => {
    // arrange
    const props: CheckinWithdrawnProps = {};

    // act
    await mountWithdrawn(props);

    // assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinWithdrawnProps = {};

    // act
    const parsed = await mountWithdrawn(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
