import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinDeclinedByClient,
  type CheckinDeclinedByClientProps,
} from './CheckinDeclinedByClient';

const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const COACH_ZONE = 'Europe/Bucharest';

async function mountDeclined(props: CheckinDeclinedByClientProps = {}) {
  const html = await renderEmail(
    <CheckinDeclinedByClient
      startsAt={STARTS_AT}
      coachTimeZone={COACH_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinDeclinedByClient', () => {
  it('names who declined in its subject', async () => {
    // arrange
    const props: CheckinDeclinedByClientProps = { clientName: 'Sofia Marin' };

    // act
    const parsed = await mountDeclined(props);

    // assert
    expect(parsed.title).toBe('Sofia Marin declined the check-in');
  });

  it('names who declined and when, in the coach zone, and that the hour is free again', async () => {
    // arrange
    const props: CheckinDeclinedByClientProps = { clientName: 'Sofia Marin' };

    // act
    await mountDeclined(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your check-in was declined.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sofia Marin')).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 5:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Europe\/Bucharest \(GMT\+3\)/)).toBeInTheDocument();
    expect(screen.getByText('That hour is free again.')).toBeInTheDocument();
  });

  it('carries no button', async () => {
    // arrange
    const props: CheckinDeclinedByClientProps = {};

    // act
    await mountDeclined(props);

    // assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinDeclinedByClientProps = {};

    // act
    const parsed = await mountDeclined(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
