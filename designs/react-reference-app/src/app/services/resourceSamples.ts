import { subDays } from 'date-fns';
import type { Resource, ResourceFileKind } from '../domain/resources';
import { documentPageArt, plateGuideArt } from '../utils/resourcePageArt';
import {
  ResourceServer,
  type ResourcePageRenderer,
  type ResourceSeed,
} from './resourceService';

const BYTES_PER_RENDERED_PAGE = 180_000;

const MAX_RENDERED_PAGES = 12;

export const browserPageRenderer: ResourcePageRenderer = {
  render({ title, kind, file }) {
    if (kind === 'image') return [URL.createObjectURL(file)];

    const pageCount = Math.min(
      MAX_RENDERED_PAGES,
      Math.max(1, Math.ceil(file.size / BYTES_PER_RENDERED_PAGE)),
    );

    return documentPageArt({ title, pageCount });
  },
};

type SampleSpec = {
  clientId: string;
  title: string;
  description: string;
  tags: string[];
  fileName: string;
  kind: ResourceFileKind;
  sizeBytes: number;
  pdfPages?: number;
  daysAgo: number;
  opened: boolean;
};

const SAMPLE_SPECS: SampleSpec[] = [
  {
    clientId: 'client-1',
    title: 'Plate portions guide',
    description: 'Half the plate vegetables, a quarter protein, a quarter carbs. Keep it on the fridge.',
    tags: ['Nutrition'],
    fileName: 'plate-portions.png',
    kind: 'image',
    sizeBytes: 412_000,
    daysAgo: 1,
    opened: false,
  },
  {
    clientId: 'client-1',
    title: 'Glute activation warm-up',
    description: 'Run through this before every lower-body session. Ten minutes is enough.',
    tags: ['Training', 'Glutes'],
    fileName: 'glute-activation-warm-up.pdf',
    kind: 'pdf',
    sizeBytes: 1_840_000,
    pdfPages: 6,
    daysAgo: 3,
    opened: false,
  },
  {
    clientId: 'client-1',
    title: 'Luteal phase meal ideas',
    description: 'Warm, filling meals for the week before your period, with easy swaps.',
    tags: ['Nutrition', 'Cycle'],
    fileName: 'luteal-phase-meal-ideas.docx',
    kind: 'word',
    sizeBytes: 640_000,
    daysAgo: 9,
    opened: true,
  },
  {
    clientId: 'client-1',
    title: 'Weekly macro tracker',
    description: 'Fill in one row a day. Totals add up on their own.',
    tags: ['Nutrition', 'Tracking'],
    fileName: 'weekly-macro-tracker.xlsx',
    kind: 'excel',
    sizeBytes: 96_000,
    daysAgo: 15,
    opened: true,
  },
  {
    clientId: 'client-1',
    title: 'Hip thrust form checklist',
    description: '',
    tags: ['Training', 'Form'],
    fileName: 'hip-thrust-form-checklist.pdf',
    kind: 'pdf',
    sizeBytes: 220_000,
    pdfPages: 1,
    daysAgo: 21,
    opened: true,
  },
  {
    clientId: 'client-1',
    title: 'Sleep and recovery basics',
    description: 'What a good night does for your training, and the small habits that get you there.',
    tags: ['Recovery', 'Sleep', 'Habits'],
    fileName: 'sleep-and-recovery-basics.pdf',
    kind: 'pdf',
    sizeBytes: 2_310_000,
    pdfPages: 8,
    daysAgo: 30,
    opened: true,
  },
  {
    clientId: 'c2',
    title: 'Glute activation warm-up',
    description: 'Run through this before every lower-body session.',
    tags: ['Training', 'Glutes'],
    fileName: 'glute-activation-warm-up.pdf',
    kind: 'pdf',
    sizeBytes: 1_840_000,
    pdfPages: 6,
    daysAgo: 5,
    opened: true,
  },
  {
    clientId: 'c2',
    title: 'Follicular phase training notes',
    description: 'Your energy climbs this week, so this is where we push the heavier sets.',
    tags: ['Training', 'Cycle'],
    fileName: 'follicular-phase-training-notes.docx',
    kind: 'word',
    sizeBytes: 520_000,
    daysAgo: 12,
    opened: false,
  },
  {
    clientId: 'c2',
    title: 'Weekly macro tracker',
    description: 'Fill in one row a day.',
    tags: ['Nutrition', 'Tracking'],
    fileName: 'weekly-macro-tracker.xlsx',
    kind: 'excel',
    sizeBytes: 96_000,
    daysAgo: 18,
    opened: true,
  },
  {
    clientId: 'c3',
    title: 'Sleep and recovery basics',
    description: 'The small habits that get you a better night.',
    tags: ['Recovery', 'Sleep'],
    fileName: 'sleep-and-recovery-basics.pdf',
    kind: 'pdf',
    sizeBytes: 2_310_000,
    pdfPages: 8,
    daysAgo: 7,
    opened: true,
  },
  {
    clientId: 'c3',
    title: 'Desk mobility routine',
    description: 'Five moves for long days at the desk.',
    tags: ['Mobility', 'Habits'],
    fileName: 'desk-mobility-routine.pdf',
    kind: 'pdf',
    sizeBytes: 480_000,
    pdfPages: 2,
    daysAgo: 20,
    opened: false,
  },
];

function pageImagesFor(spec: SampleSpec): string[] {
  if (spec.kind === 'image') return [plateGuideArt()];
  if (spec.pdfPages === undefined) return [];

  return documentPageArt({ title: spec.title, pageCount: spec.pdfPages });
}

export function sampleResources(now: Date): Resource[] {
  return SAMPLE_SPECS.map((spec, index) => {
    const addedAt = subDays(now, spec.daysAgo);

    return {
      id: `resource-${index + 1}`,
      clientId: spec.clientId,
      title: spec.title,
      description: spec.description,
      tags: spec.tags,
      file: {
        name: spec.fileName,
        kind: spec.kind,
        sizeBytes: spec.sizeBytes,
      },
      pageImageUrls: pageImagesFor(spec),
      addedAt,
      openedAt: spec.opened ? addedAt : null,
    };
  });
}

export function createResourceServer(seed: ResourceSeed): ResourceServer {
  const now = () => new Date();

  return new ResourceServer({
    records: seed === 'seeded' ? sampleResources(now()) : [],
    renderer: browserPageRenderer,
    now,
  });
}
