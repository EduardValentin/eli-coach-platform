import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinScheduleCancelled,
  type CheckinScheduleCancelledProps,
} from './CheckinScheduleCancelled';

const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountCancelled(props: CheckinScheduleCancelledProps = {}) {
  const html = await renderEmail(
    <CheckinScheduleCancelled
      startsAt={STARTS_AT}
      clientTimeZone={CLIENT_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinScheduleCancelled', () => {
  it('names the coach who cancelled in its subject', async () => {
    // arrange
    const props: CheckinScheduleCancelledProps = { coachName: 'Eli' };

    // act
    const parsed = await mountCancelled(props);

    // assert
    expect(parsed.title).toBe('Eli cancelled the check-in request');
  });

  it('says which hour was cancelled, in her zone, and that nothing is planned then', async () => {
    // arrange
    const props: CheckinScheduleCancelledProps = { coachName: 'Eli' };

    // act
    await mountCancelled(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'A request was cancelled.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Eli cancelled the check-in request.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 3:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Europe\/London \(GMT\+1\)/)).toBeInTheDocument();
    expect(
      screen.getByText('No check-in is planned for that hour.'),
    ).toBeInTheDocument();
  });

  it('carries no button', async () => {
    // arrange
    const props: CheckinScheduleCancelledProps = {};

    // act
    await mountCancelled(props);

    // assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinScheduleCancelledProps = {};

    // act
    const parsed = await mountCancelled(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
