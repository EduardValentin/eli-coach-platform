import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateTimeLabel } from './DateTimeLabel';

describe('DateTimeLabel', () => {
  it('renders the date and time with a middle dot separator', () => {
    render(
      <DateTimeLabel
        startsAt={new Date('2026-03-12T15:30:00Z')}
        timeZone="UTC"
      />,
    );

    expect(screen.getByText('Thu, Mar 12')).toBeVisible();
    expect(screen.getByText('· 3:30 PM')).toBeVisible();
  });
});
