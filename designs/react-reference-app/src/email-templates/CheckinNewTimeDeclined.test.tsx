import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckinNewTimeDeclined, type CheckinNewTimeDeclinedProps } from './CheckinNewTimeDeclined';

const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountEmail(props: CheckinNewTimeDeclinedProps = {}) {
  const html = await renderEmail(
    <CheckinNewTimeDeclined startsAt={STARTS_AT} timeZone={CLIENT_ZONE} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinNewTimeDeclined', () => {
  it('names who declined in its subject', async () => {
    // arrange
    const props: CheckinNewTimeDeclinedProps = { who: 'Eli' };

    // act
    const parsed = await mountEmail(props);

    // assert
    expect(parsed.title).toBe('Eli declined the new time');
  });

  it('says who declined and which hour, in the recipient zone, and that it is free again', async () => {
    // arrange
    const props: CheckinNewTimeDeclinedProps = { who: 'Eli' };

    // act
    await mountEmail(props);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'The new time was declined.' })).toBeInTheDocument();
    expect(screen.getByText('CHECK-IN — NEW TIME DECLINED')).toBeInTheDocument();
    expect(screen.getByText('WHO')).toBeInTheDocument();
    expect(screen.getByText('Eli')).toBeInTheDocument();
    expect(screen.getByText('WHEN')).toBeInTheDocument();
    expect(screen.getByText(/Monday, 12 October 2026 at 3:00\s?[AaPp][Mm]/)).toBeInTheDocument();
    expect(screen.getByText(/Europe\/London \(GMT\+1\)/)).toBeInTheDocument();
    expect(screen.getByText('That hour is free again.')).toBeInTheDocument();
  });

  it('carries no button', async () => {
    // arrange
    const props: CheckinNewTimeDeclinedProps = {};

    // act
    await mountEmail(props);

    // assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('names the event in its footer', async () => {
    // arrange
    const props: CheckinNewTimeDeclinedProps = {};

    // act
    await mountEmail(props);

    // assert
    expect(screen.getByText('You received this email because a new time you proposed for a check-in was declined on the Evoa site.')).toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinNewTimeDeclinedProps = {};

    // act
    const parsed = await mountEmail(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
