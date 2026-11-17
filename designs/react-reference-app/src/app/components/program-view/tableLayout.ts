import { LABEL_CLASS } from '../typography';
import { cn } from '../ui/utils';

export const TABLE_BESIDE_CLASS = '@3xl:grid-cols-[minmax(0,1fr)_27rem]';

export const TABLE_HEAD_CLASS = cn(LABEL_CLASS, 'py-1.5');

export const TABLE_CELL_CLASS = 'h-11 p-0 align-middle @3xl:h-12';

/** A printed table row: the viewer's row on screen, a handwriting line on paper. */
export const DOCUMENT_CELL_CLASS = 'h-document-row align-middle';

/** 160px, so a strength day's RIR pills and a cardio day's effort pills stand on one line. */
export const EFFORT_COLUMN_CLASS = 'w-40';

export const PAIRED_RIR_COLUMN_CLASS = 'w-18';

export const VALUE_COLUMN_CLASS = 'w-22';

export const TIME_COLUMN_CLASS = 'w-19 pr-3 text-right @3xl:w-22';

export const SEGMENT_EFFORT_COLUMN_CLASS = { narrow: 'w-14 @3xl:w-40', wide: 'w-22 @3xl:w-40' } as const;

export const DOCUMENT_SET_COLUMNS = { set: 'w-[3.2em]', reps: 'w-[8em]', rir: 'w-[4.4em]', weight: 'w-[5em]' } as const;
