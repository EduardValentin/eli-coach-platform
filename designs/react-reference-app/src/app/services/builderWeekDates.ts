export const BUILDER_WEEK_DATES = ['from-today', 'undated'] as const;
export type BuilderWeekDates = (typeof BUILDER_WEEK_DATES)[number];
