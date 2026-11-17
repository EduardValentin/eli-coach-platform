import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { WEEKDAYS, type Weekday } from '../../domain/program';
export type DaysMode = 'focus' | 'all';

type WeekChoice = { week: number | null; day: Weekday | null; mode: DaysMode };

export type WeekSelection = WeekChoice & { choose: (change: Partial<WeekChoice>) => void };

const WEEK_PARAM = 'week';
const DAY_PARAM = 'day';
const MODE_PARAM = 'days';
const NO_CHOICE: WeekChoice = { week: null, day: null, mode: 'focus' };

function weekdayOf(value: string | null): Weekday | null {
  return WEEKDAYS.find(weekday => weekday === value) ?? null;
}

function weekOf(value: string | null): number | null {
  const week = Number(value);
  return value !== null && Number.isInteger(week) ? week : null;
}

function withParam(params: URLSearchParams, name: string, value: string | null) {
  if (value === null) params.delete(name);
  else params.set(name, value);
}

export function useUrlWeekSelection(): WeekSelection {
  const [searchParams, setSearchParams] = useSearchParams();
  const choice: WeekChoice = {
    week: weekOf(searchParams.get(WEEK_PARAM)),
    day: weekdayOf(searchParams.get(DAY_PARAM)),
    mode: searchParams.get(MODE_PARAM) === 'all' ? 'all' : 'focus',
  };

  function choose(change: Partial<WeekChoice>) {
    const next = { ...choice, ...change };
    const params = new URLSearchParams(searchParams);
    withParam(params, WEEK_PARAM, next.week === null ? null : String(next.week));
    withParam(params, DAY_PARAM, next.day);
    withParam(params, MODE_PARAM, next.mode === 'all' ? 'all' : null);
    setSearchParams(params, { replace: true });
  }

  return { ...choice, choose };
}

export function useLocalWeekSelection(): WeekSelection {
  const [choice, setChoice] = useState(NO_CHOICE);
  return { ...choice, choose: change => setChoice(current => ({ ...current, ...change })) };
}
