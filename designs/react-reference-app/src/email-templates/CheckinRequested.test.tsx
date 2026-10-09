import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinRequested,
  type CheckinRequestedProps,
} from './CheckinRequested';

const REVIEW_URL = 'https://evoa.fit/coach/checkins';
const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const COACH_ZONE = 'Europe/Bucharest';

async function mountRequested(props: CheckinRequestedProps = {}) {
  const html = await renderEmail(
    <CheckinRequested
      reviewUrl={REVIEW_URL}
      startsAt={STARTS_AT}
      coachTimeZone={COACH_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinRequested', () => {
  it('names who asked in its subject', async () => {
    // arrange
    const props: CheckinRequestedProps = { clientName: 'Sofia Marin' };

    // act
    const parsed = await mountRequested(props);

    // assert
    expect(parsed.title).toBe('Sofia Marin asked for a check-in');
  });

  it('names who asked and when, in the coach zone', async () => {
    // arrange
    const props: CheckinRequestedProps = { clientName: 'Sofia Marin' };

    // act
    await mountRequested(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'A new check-in request.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sofia Marin')).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 5:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Europe\/Bucharest \(GMT\+3\)/),
    ).toBeInTheDocument();
  });

  it('shows her note when she wrote one', async () => {
    // arrange
    const props: CheckinRequestedProps = {
      note: 'My knee felt sore after Tuesday.',
    };

    // act
    await mountRequested(props);

    // assert
    expect(screen.getByText('HER NOTE')).toBeInTheDocument();
    expect(
      screen.getByText('My knee felt sore after Tuesday.'),
    ).toBeInTheDocument();
  });

  it('leaves the note out when she wrote none', async () => {
    // arrange
    const props: CheckinRequestedProps = { note: null };

    // act
    await mountRequested(props);

    // assert
    expect(screen.queryByText('HER NOTE')).not.toBeInTheDocument();
  });

  it('leaves the note out when it is blank', async () => {
    // arrange
    const props: CheckinRequestedProps = { note: '   ' };

    // act
    await mountRequested(props);

    // assert
    expect(screen.queryByText('HER NOTE')).not.toBeInTheDocument();
  });

  it('links to the coach Check-ins page', async () => {
    // arrange
    const props: CheckinRequestedProps = {};

    // act
    await mountRequested(props);

    // assert
    expect(
      screen.getByRole('link', { name: 'Review the request' }),
    ).toHaveAttribute('href', REVIEW_URL);
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinRequestedProps = {};

    // act
    const parsed = await mountRequested(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
