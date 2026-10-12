import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckinNewTime, type CheckinNewTimeProps } from './CheckinNewTime';

const CHECKINS_URL = 'https://evoa.fit/portal/checkins';
const EARLIER_STARTS_AT = new Date('2026-10-09T13:00:00.000Z');
const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountNewTime(props: CheckinNewTimeProps = {}) {
  const html = await renderEmail(
    <CheckinNewTime
      checkinsUrl={CHECKINS_URL}
      earlierStartsAt={EARLIER_STARTS_AT}
      startsAt={STARTS_AT}
      timeZone={CLIENT_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinNewTime', () => {
  it('names who proposed the new time in its subject', async () => {
    // arrange
    const props: CheckinNewTimeProps = { who: 'Sofia Marin' };

    // act
    const parsed = await mountNewTime(props);

    // assert
    expect(parsed.title).toBe('Sofia Marin proposed a new time for your check-in');
  });

  it('names who proposed it with the earlier and the new time, in the recipient zone', async () => {
    // arrange
    const props: CheckinNewTimeProps = { who: 'Eli' };

    // act
    await mountNewTime(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'A new time for your check-in.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CHECK-IN — NEW TIME')).toBeInTheDocument();
    expect(screen.getByText('WHO')).toBeInTheDocument();
    expect(screen.getByText('Eli')).toBeInTheDocument();
    expect(screen.getByText('EARLIER')).toBeInTheDocument();
    expect(screen.getByText(/Friday, 9 October 2026 at 2:00\s?[AaPp][Mm]/)).toBeInTheDocument();
    expect(screen.getByText('NEW TIME')).toBeInTheDocument();
    expect(screen.getByText(/Monday, 12 October 2026 at 3:00\s?[AaPp][Mm]/)).toBeInTheDocument();
    expect(screen.getAllByText(/Europe\/London \(GMT\+1\)/)).toHaveLength(2);
  });

  it('shows the note that came with the new time', async () => {
    // arrange
    const props: CheckinNewTimeProps = { note: 'I am travelling that Wednesday.' };

    // act
    await mountNewTime(props);

    // assert
    expect(screen.getByText('NOTE')).toBeInTheDocument();
    expect(screen.getByText('I am travelling that Wednesday.')).toBeInTheDocument();
  });

  it('leaves the note out when there is none', async () => {
    // arrange
    const props: CheckinNewTimeProps = { note: null };

    // act
    await mountNewTime(props);

    // assert
    expect(screen.queryByText('NOTE')).not.toBeInTheDocument();
  });

  it('leaves the note out when it is blank', async () => {
    // arrange
    const props: CheckinNewTimeProps = { note: '   ' };

    // act
    await mountNewTime(props);

    // assert
    expect(screen.queryByText('NOTE')).not.toBeInTheDocument();
  });

  it('links to the recipient Check-ins page to answer it', async () => {
    // arrange
    const props: CheckinNewTimeProps = {};

    // act
    await mountNewTime(props);

    // assert
    expect(screen.getByRole('link', { name: 'Answer the proposal' })).toHaveAttribute(
      'href',
      CHECKINS_URL,
    );
  });

  it('names the event in its footer', async () => {
    // arrange
    const props: CheckinNewTimeProps = {};

    // act
    await mountNewTime(props);

    // assert
    expect(
      screen.getByText(
        'You received this email because a new time was proposed for one of your check-ins on the Evoa site.',
      ),
    ).toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinNewTimeProps = {};

    // act
    const parsed = await mountNewTime(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
