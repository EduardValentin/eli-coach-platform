import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckinCancelled, type CheckinCancelledProps } from './CheckinCancelled';

const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountEmail(props: CheckinCancelledProps = {}) {
  const html = await renderEmail(
    <CheckinCancelled startsAt={STARTS_AT} timeZone={CLIENT_ZONE} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinCancelled', () => {
  it('names who cancelled in its subject', async () => {
    // arrange
    const props: CheckinCancelledProps = { who: 'Eli' };

    // act
    const parsed = await mountEmail(props);

    // assert
    expect(parsed.title).toBe('Eli cancelled the check-in');
  });

  it('says who cancelled and which hour, in the recipient zone, and that it is free again', async () => {
    // arrange
    const props: CheckinCancelledProps = { who: 'Eli' };

    // act
    await mountEmail(props);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'A check-in was cancelled.' })).toBeInTheDocument();
    expect(screen.getByText('CHECK-IN — CANCELLED')).toBeInTheDocument();
    expect(screen.getByText('WHO')).toBeInTheDocument();
    expect(screen.getByText('Eli')).toBeInTheDocument();
    expect(screen.getByText('WHEN')).toBeInTheDocument();
    expect(screen.getByText(/Monday, 12 October 2026 at 3:00\s?[AaPp][Mm]/)).toBeInTheDocument();
    expect(screen.getByText(/Europe\/London \(GMT\+1\)/)).toBeInTheDocument();
    expect(screen.getByText('That hour is free again.')).toBeInTheDocument();
  });

  it('carries no button', async () => {
    // arrange
    const props: CheckinCancelledProps = {};

    // act
    await mountEmail(props);

    // assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('names the event in its footer', async () => {
    // arrange
    const props: CheckinCancelledProps = {};

    // act
    await mountEmail(props);

    // assert
    expect(screen.getByText('You received this email because a check-in you had planned was cancelled on the Evoa site.')).toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinCancelledProps = {};

    // act
    const parsed = await mountEmail(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
