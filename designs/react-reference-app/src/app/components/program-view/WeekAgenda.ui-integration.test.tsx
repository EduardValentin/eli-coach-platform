import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seededProgramView } from '../../../test/programFixtures';
import { WeekAgenda } from './WeekAgenda';
import { dayPlanName, weekViewAt } from './weekView';

const DAY_ONE = new Date(2026, 8, 14);

function firstWeek() {
  const view = seededProgramView({ seed: 'published', dayOne: DAY_ONE, today: DAY_ONE });
  return { week: weekViewAt(view, 1), exercisesById: view.exercisesById };
}

describe('WeekAgenda', () => {
  it("dates each of the seven days over its name and length, a training day linking to the day's page where there is one", () => {
    // arrange
    const { week, exercisesById } = firstWeek();
    const session = week.days.find(day => day.plan.kind === 'session');
    if (!session) throw new Error('session missing');

    // act
    render(<WeekAgenda days={week.days} exercisesById={exercisesById} hrefOf={day => (day.plan.kind === 'session' ? `#${day.weekday}` : undefined)} />);

    // assert
    const days = within(screen.getByRole('list', { name: 'Days of the week' })).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(within(days[0]).getByText(/^Monday 14 September, /)).toBeInTheDocument();
    expect(within(days[6]).getByText('Sunday 20 September, Rest')).toBeInTheDocument();
    const link = within(days[week.days.indexOf(session)]).getByRole('link', { name: new RegExp(`^\\w+day \\d+ September, ${dayPlanName(session.plan)}, about \\d+ min$`) });
    expect(link).toHaveAttribute('href', `#${session.weekday}`);
    expect(screen.queryByRole('link', { name: /Rest/ })).not.toBeInTheDocument();
  });

  it('reads every day as sessions to come while the block is not written, without links', () => {
    // arrange
    const { week, exercisesById } = firstWeek();

    // act
    render(<WeekAgenda days={week.days} exercisesById={exercisesById} state="to-come" hrefOf={day => `#${day.weekday}`} />);

    // assert
    expect(screen.getAllByText('Sessions to come')).toHaveLength(7);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
