import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinScheduled,
  type CheckinScheduledProps,
} from './CheckinScheduled';

const CHECKINS_URL = 'https://evoa.fit/portal/checkins';
const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountScheduled(props: CheckinScheduledProps = {}) {
  const html = await renderEmail(
    <CheckinScheduled
      checkinsUrl={CHECKINS_URL}
      startsAt={STARTS_AT}
      clientTimeZone={CLIENT_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinScheduled', () => {
  it('names the coach who scheduled it in its subject', async () => {
    // arrange
    const props: CheckinScheduledProps = { coachName: 'Eli' };

    // act
    const parsed = await mountScheduled(props);

    // assert
    expect(parsed.title).toBe('Eli scheduled a check-in with you');
  });

  it('says when, in her zone, and that she can approve or decline it', async () => {
    // arrange
    const props: CheckinScheduledProps = { coachName: 'Eli' };

    // act
    await mountScheduled(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'A check-in with Eli.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Eli picked a time. You can approve or decline it.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 3:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Europe\/London \(GMT\+1\)/)).toBeInTheDocument();
  });

  it('shows the coach note when she wrote one', async () => {
    // arrange
    const props: CheckinScheduledProps = { note: 'Let us look at your squat depth.' };

    // act
    await mountScheduled(props);

    // assert
    expect(screen.getByText('NOTE')).toBeInTheDocument();
    expect(screen.getByText('Let us look at your squat depth.')).toBeInTheDocument();
  });

  it('leaves the note out when she wrote none', async () => {
    // arrange
    const props: CheckinScheduledProps = { note: null };

    // act
    await mountScheduled(props);

    // assert
    expect(screen.queryByText('NOTE')).not.toBeInTheDocument();
  });

  it('leaves the note out when it is blank', async () => {
    // arrange
    const props: CheckinScheduledProps = { note: '   ' };

    // act
    await mountScheduled(props);

    // assert
    expect(screen.queryByText('NOTE')).not.toBeInTheDocument();
  });

  it('links to her Check-ins page to answer it', async () => {
    // arrange
    const props: CheckinScheduledProps = {};

    // act
    await mountScheduled(props);

    // assert
    expect(
      screen.getByRole('link', { name: 'Answer the request' }),
    ).toHaveAttribute('href', CHECKINS_URL);
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinScheduledProps = {};

    // act
    const parsed = await mountScheduled(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
