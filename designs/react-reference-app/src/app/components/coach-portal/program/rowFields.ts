import type { Exercise } from '../../../context/TrainingContext';
import type { Range, Row, RowField } from '../../../domain/program';

export const RANGE_PROBLEM = 'Use a number or a range like 8–12';
export const REST_PROBLEM = 'Use seconds or m:ss like 1:30';
export const COUNT_PROBLEM = 'Use a whole number';

const RANGE_PATTERN = /^(\d+)(?:\s*[-–]\s*(\d+))?$/;
const MINUTES_PATTERN = /^(\d+):([0-5]\d)$/;
const SECONDS_PATTERN = /^(\d+)\s*s?$/;
const SECONDS_PER_MINUTE = 60;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

export function parseSeconds(text: string): number | null {
  const trimmed = text.trim();
  return WHOLE_NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : null;
}

export function parseCount(text: string): number | null {
  const count = parseSeconds(text);
  return count !== null && count > 0 ? count : null;
}

export function parseRange(text: string): Range | null {
  const match = RANGE_PATTERN.exec(text.trim());
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] === undefined ? min : Number(match[2]);
  return min <= max ? { min, max } : null;
}

export function formatRest(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} s`;
  const rest = seconds % SECONDS_PER_MINUTE;
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(rest).padStart(2, '0')}`;
}

export function parseRest(text: string): number | null {
  const trimmed = text.trim();
  const minutes = MINUTES_PATTERN.exec(trimmed);
  if (minutes) return Number(minutes[1]) * SECONDS_PER_MINUTE + Number(minutes[2]);
  const seconds = SECONDS_PATTERN.exec(trimmed);
  return seconds ? Number(seconds[1]) : null;
}

export function repsSuffix(exercise: Exercise | undefined): string {
  if (exercise?.measuredIn === 'time') return ' s';
  return exercise?.perSide ? ' /side' : '';
}

export function withField<Field extends RowField>(row: Row, field: Field, value: Row[Field]): Row {
  const touched = row.touched.includes(field) ? row.touched : [...row.touched, field];
  return { ...row, [field]: value, touched };
}
