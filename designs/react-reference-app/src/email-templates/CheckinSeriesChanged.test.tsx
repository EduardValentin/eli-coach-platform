import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckinSeriesChanged, type CheckinSeriesChangedProps } from './CheckinSeriesChanged';

const FIRST_STARTS_AT = new Date('2026-10-30T17:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountChanged(props: CheckinSeriesChangedProps = {}) {
  const html = await renderEmail(
    <CheckinSeriesChanged firstStartsAt={FIRST_STARTS_AT} clientTimeZone={CLIENT_ZONE} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinSeriesChanged', () => {
  it('names the coach who changed it in its subject', async () => {
    // arrange
    const props: CheckinSeriesChangedProps = { coachName: 'Eli' };

    // act
    const parsed = await mountChanged(props);

    // assert
    expect(parsed.title).toBe('Eli changed your weekly check-in');
  });

  it('names the new weekday and time in her zone and the first week', async () => {
    // arrange
    const props: CheckinSeriesChangedProps = { coachName: 'Eli' };

    // act
    await mountChanged(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your weekly check-in moved.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Eli moved every week still to come.')).toBeInTheDocument();
    expect(
      screen.getByText(/^Every Friday at 5:00\s?PM — Europe\/London \(GMT\+0\)$/),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Friday, 30 October 2026 at 5:00\s?PM$/)).toBeInTheDocument();
  });

  it('links to her check-ins', async () => {
    // arrange
    const props: CheckinSeriesChangedProps = { checkinsUrl: 'https://evoa.test/portal/checkins' };

    // act
    await mountChanged(props);

    // assert
    expect(screen.getByRole('link', { name: 'See your check-ins' })).toHaveAttribute(
      'href',
      'https://evoa.test/portal/checkins',
    );
  });
});
