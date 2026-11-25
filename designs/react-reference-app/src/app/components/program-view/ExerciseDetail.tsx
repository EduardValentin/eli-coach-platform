import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, VideoOff } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { BACK_LINK_CLASS } from '../PortalBackLink';
import { ResponsiveSheetDialog, SheetDialogBody, SheetDialogFooter, SheetDialogHeader } from '../ResponsiveSheetDialog';
import { EYEBROW_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { ExerciseDetailContext, type ExerciseDetailContent } from './exerciseDetailContent';
import { nonEmptyLines } from './ProgramText';
import { SwapRows } from './SwapList';
import { TargetsSummary } from './TargetsSummary';

type Shown = { detail: ExerciseDetailContent; swap: Exercise | null };

type FocusTarget = { kind: 'title' } | { kind: 'swap'; id: string };

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5">
      <h3 className={EYEBROW_CLASS}>{title}</h3>
      {children}
    </section>
  );
}

function ExerciseVideo({ exercise }: { exercise: Exercise }) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  if (!exercise.videoUrl) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <VideoOff aria-hidden="true" className="size-4 shrink-0" />
        No video for this exercise yet.
      </p>
    );
  }
  const isPortrait = aspectRatio !== null && aspectRatio < 1;
  return (
    <div className="flex justify-center lg:justify-start">
      <video
        src={exercise.videoUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={`${exercise.name} video`}
        onLoadedMetadata={event => setAspectRatio(event.currentTarget.videoWidth / event.currentTarget.videoHeight)}
        style={aspectRatio ? { aspectRatio } : undefined}
        className={cn('max-w-full rounded-card bg-surface-inverted object-contain shadow-card', {
          'aspect-video w-full': aspectRatio === null,
          'w-full': aspectRatio !== null && !isPortrait,
          'h-[60svh] w-auto': isPortrait,
        })}
      />
    </div>
  );
}

function Cues({ text }: { text: string }) {
  const lines = nonEmptyLines(text);
  if (lines.length === 0) return null;
  return (
    <DetailSection title="Cues">
      {lines.length === 1 ? (
        <p className="text-base text-text-primary">{lines[0]}</p>
      ) : (
        <ol className="grid list-decimal gap-1.5 pl-5 text-base text-text-primary marker:font-semibold marker:tabular-nums">
          {lines.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      )}
    </DetailSection>
  );
}

function listed(values: readonly string[]): string {
  return values.length > 0 ? values.join(', ') : 'None';
}

function MusclesWorked({ exercise }: { exercise: Exercise }) {
  const rows = [
    { term: 'Primary', value: listed(exercise.primaryMuscles) },
    { term: 'Secondary', value: listed(exercise.secondaryMuscles) },
    { term: 'Equipment', value: listed(exercise.equipment) },
  ];
  return (
    <DetailSection title="Muscles worked">
      <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1 text-base text-text-primary">
        {rows.map(row => (
          <div key={row.term} className="contents">
            <dt className="pt-0.5 text-sm text-text-secondary">{row.term}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  );
}

type DetailBodyProps = { shown: Shown; onOpenSwap: (swap: Exercise) => void; onBack: () => void };

function DetailBody({ shown, onOpenSwap, onBack }: DetailBodyProps) {
  const { detail, swap } = shown;
  const exercise = swap ?? detail.exercise;
  return (
    <div className="grid content-start gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-x-8">
      <div className="grid content-start gap-5">
        {swap && (
          <button type="button" onClick={onBack} className={cn(BACK_LINK_CLASS, '-mb-2 min-h-12 justify-self-start rounded-field')}>
            <ArrowLeft aria-hidden="true" size={16} />
            {`Back to ${detail.exercise.name}`}
          </button>
        )}
        <ExerciseVideo key={exercise.id} exercise={exercise} />
        {detail.targets.length > 0 && (
          <DetailSection title={swap ? 'Do it instead, with the same targets' : 'Targets'}>
            <TargetsSummary items={detail.targets} size="md" />
          </DetailSection>
        )}
      </div>
      <div className="grid content-start gap-5">
        <Cues text={swap ? swap.cues : detail.cues || detail.exercise.cues} />
        <MusclesWorked exercise={exercise} />
        {!swap && detail.swaps.length > 0 && (
          <DetailSection title="Swaps">
            <SwapRows label={`Swaps for ${detail.exercise.name}`} swaps={detail.swaps} actionFor={candidate => ({ kind: 'open', onOpen: () => onOpenSwap(candidate) })} />
          </DetailSection>
        )}
        {!swap && detail.progression && (
          <DetailSection title="How to progress">
            <p className="text-sm leading-relaxed text-text-secondary">{detail.progression}</p>
          </DetailSection>
        )}
      </div>
    </div>
  );
}

type ExerciseDetailProviderProps = { footer?: (exercise: Exercise) => ReactNode; children: ReactNode };

export function ExerciseDetailProvider({ footer, children }: ExerciseDetailProviderProps) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const focusAfterChange = useRef<FocusTarget | null>(null);

  useEffect(() => {
    const target = focusAfterChange.current;
    if (target === null) return;
    focusAfterChange.current = null;
    const swapRow = target.kind === 'swap' ? body.current?.querySelector<HTMLElement>(`[data-swap="${target.id}"]`) : null;
    (swapRow ?? title.current)?.focus();
  }, [shown]);

  function openDetail(detail: ExerciseDetailContent, from: HTMLElement, swap: Exercise | null = null) {
    opener.current = from;
    setShown({ detail, swap });
    setOpen(true);
  }

  function showSwap(swap: Exercise | null, focusTarget: FocusTarget) {
    if (!shown) return;
    focusAfterChange.current = focusTarget;
    setShown({ detail: shown.detail, swap });
  }

  function backFrom(swap: Exercise | null): FocusTarget {
    return swap ? { kind: 'swap', id: swap.id } : { kind: 'title' };
  }

  const exercise = shown ? (shown.swap ?? shown.detail.exercise) : null;
  const detailFooter = exercise && footer?.(exercise);

  return (
    <ExerciseDetailContext.Provider value={openDetail}>
      {children}
      {shown && exercise && (
        <ResponsiveSheetDialog open={open} onOpenChange={setOpen} title={exercise.name} width="media" sheetClose="shown" initialFocus={title} returnFocusTo={opener}>
          <SheetDialogHeader
            eyebrow={shown.swap && <p className={cn(EYEBROW_CLASS, 'mb-1 pr-10')}>{shown.detail.swapContext}</p>}
            title={exercise.name}
            titleRef={title}
          />
          <SheetDialogBody>
            <div ref={body} data-parity-root="ExerciseDetail">
              <DetailBody shown={shown} onOpenSwap={swap => showSwap(swap, { kind: 'title' })} onBack={() => showSwap(null, backFrom(shown.swap))} />
            </div>
          </SheetDialogBody>
          {detailFooter && <SheetDialogFooter>{detailFooter}</SheetDialogFooter>}
        </ResponsiveSheetDialog>
      )}
    </ExerciseDetailContext.Provider>
  );
}
