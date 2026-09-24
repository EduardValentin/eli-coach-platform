import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GoalWidget } from './GoalWidget';
import type { Goal } from '../context/TrainingContext';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

const goal: Goal = {
  id: 'goal-1',
  type: 'Fat Loss',
  clientId: 'client-1',
  startDate: '2026-01-06',
  status: 'active',
};

describe('GoalWidget on the coach presentation', () => {
  it('offers to start a goal when there is none', () => {
    render(
      <GoalWidget
        goal={null}
        headingId="goal-heading"
        management={{ onStart: vi.fn(), onEnd: vi.fn() }}
        presentation="coach"
      />,
    );

    expect(screen.getByText('No goal yet')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start a goal' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'End goal' }),
    ).not.toBeInTheDocument();
  });

  it('starts the picked goal type through the inline editor', async () => {
    const onStart = vi.fn();
    render(
      <GoalWidget
        goal={null}
        headingId="goal-heading"
        management={{ onStart, onEnd: vi.fn() }}
        presentation="coach"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Start a goal' }));
    expect(
      screen.queryByRole('button', { name: 'Start a goal' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Goal type' }));
    await userEvent.click(screen.getByRole('option', { name: 'Strength' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start goal' }));

    expect(onStart).toHaveBeenCalledWith('Strength');
    expect(screen.getByRole('button', { name: 'Start a goal' })).toBeVisible();
  });

  it('cancels the inline editor without starting a goal', async () => {
    const onStart = vi.fn();
    render(
      <GoalWidget
        goal={null}
        headingId="goal-heading"
        management={{ onStart, onEnd: vi.fn() }}
        presentation="coach"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Start a goal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start a goal' })).toBeVisible();
    expect(screen.getByText('No goal yet')).toBeVisible();
  });

  it('preselects the most recent completed goal type in the inline editor', async () => {
    render(
      <GoalWidget
        goal={null}
        headingId="goal-heading"
        management={{
          onStart: vi.fn(),
          onEnd: vi.fn(),
          suggestedType: 'Strength',
        }}
        presentation="coach"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Start a goal' }));

    expect(
      screen.getByRole('combobox', { name: 'Goal type' }),
    ).toHaveTextContent('Strength');
  });

  it('shows the active goal and ends it through a confirm dialog', async () => {
    const onEnd = vi.fn();
    render(
      <GoalWidget
        goal={goal}
        headingId="goal-heading"
        management={{ onStart: vi.fn(), onEnd }}
        presentation="coach"
      />,
    );

    expect(screen.getByText('Fat Loss')).toBeVisible();
    expect(screen.getByText('Started 6 January')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'End goal' }));

    expect(
      screen.getByRole('heading', { name: 'End this goal?' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Her plan keeps running. You can start a new goal afterwards.',
      ),
    ).toBeVisible();
    expect(onEnd).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'End goal' }));

    expect(onEnd).toHaveBeenCalled();
  });

  it('is read-only without management', () => {
    render(
      <GoalWidget goal={goal} headingId="goal-heading" presentation="coach" />,
    );

    expect(
      screen.queryByRole('button', { name: 'End goal' }),
    ).not.toBeInTheDocument();
  });
});

describe('GoalWidget on the client presentation', () => {
  it('never shows management controls, even if passed', () => {
    render(
      <GoalWidget
        goal={null}
        headingId="goal-heading"
        management={{ onStart: vi.fn(), onEnd: vi.fn() }}
        presentation="client"
        emptyMessage="Eli sets your goal when your program is ready."
      />,
    );

    expect(
      screen.getByText('Eli sets your goal when your program is ready.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Start a goal' }),
    ).not.toBeInTheDocument();
  });

  it('falls back to the default empty message when none is passed', () => {
    render(
      <GoalWidget goal={null} headingId="goal-heading" presentation="client" />,
    );

    expect(screen.getByText('No goal yet')).toBeVisible();
  });

  it('shows the active goal without an End goal control', () => {
    render(
      <GoalWidget goal={goal} headingId="goal-heading" presentation="client" />,
    );

    expect(screen.getByText('Fat Loss')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'End goal' }),
    ).not.toBeInTheDocument();
  });
});
