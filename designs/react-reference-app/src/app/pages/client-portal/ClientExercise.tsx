import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowLeftRight, ChevronRight, ListChecks, SearchX, VideoOff, type LucideIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { PortalWidget } from '../../components/PortalWidget';
import { buttonVariants } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import type { Exercise } from '../../context/TrainingContext';
import { useExerciseGuide } from '../../hooks/useExerciseGuide';
import { clientExercisePath } from '../../utils/exerciseLinks';

const PROGRAM_PATH = '/portal/program';

function useArrivalFocus(exerciseId: string, heading: RefObject<HTMLHeadingElement>) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [exerciseId, heading]);
}

function GuideSection({ title, icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  const headingId = useId();
  return (
    <PortalWidget presentation="client" title={title} icon={icon} headingId={headingId}>
      {children}
    </PortalWidget>
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

function SwapLink({ swap }: { swap: Exercise }) {
  return (
    <li>
      <Link
        to={clientExercisePath(swap.id)}
        className="group flex min-h-12 items-center justify-between gap-3 py-3 text-text-primary transition-colors hover:text-primary"
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">{swap.name}</span>
          {swap.equipment.length > 0 && <span className="text-xs text-text-secondary">{swap.equipment.join(', ')}</span>}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-secondary group-hover:text-primary" />
      </Link>
    </li>
  );
}

function ExerciseNotFound({ heading }: { heading: RefObject<HTMLHeadingElement> }) {
  return (
    <div data-parity-root="ClientExercise">
      <PortalPageHeader title="Exercise" headingRef={heading} />
      <EmptyState
        icon={SearchX}
        title="We couldn't find this exercise"
        description="It may have changed since your program was shared. Your program always has the latest."
        action={
          <Link to={PROGRAM_PATH} className={buttonVariants()}>
            Go to your program
          </Link>
        }
      />
    </div>
  );
}

export function ClientExercise() {
  const { exerciseId = '' } = useParams();
  const guide = useExerciseGuide(exerciseId);
  const heading = useRef<HTMLHeadingElement>(null);
  useArrivalFocus(exerciseId, heading);

  if (!guide) return <ExerciseNotFound heading={heading} />;

  const { exercise, cues, swaps } = guide;
  const hasVideo = exercise.videoUrl !== undefined;

  return (
    <div data-parity-root="ClientExercise">
      <PortalBackLink to={PROGRAM_PATH}>Back to program</PortalBackLink>
      <PortalPageHeader
        eyebrow="Exercise"
        title={exercise.name}
        subtitle={exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles.join(' · ') : undefined}
        headingRef={heading}
      />
      <div
        className={cn('grid items-start gap-6', {
          'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]': hasVideo,
          'max-w-reading': !hasVideo,
        })}
      >
        <ExerciseVideo key={exercise.id} exercise={exercise} />
        <div className="grid gap-6">
          {cues.length > 0 && (
            <GuideSection title="How to do it" icon={ListChecks}>
              <div className="grid gap-3 text-sm leading-relaxed whitespace-pre-line text-text-primary">
                {cues.map(cue => (
                  <p key={cue}>{cue}</p>
                ))}
              </div>
            </GuideSection>
          )}
          {swaps.length > 0 && (
            <GuideSection title="Swaps" icon={ArrowLeftRight}>
              <div className="grid gap-3">
                <p className="text-sm text-text-secondary">If you can't do this one today, do one of these instead.</p>
                <ul className="divide-y divide-border-subtle">
                  {swaps.map(swap => (
                    <SwapLink key={swap.id} swap={swap} />
                  ))}
                </ul>
              </div>
            </GuideSection>
          )}
        </div>
      </div>
    </div>
  );
}
