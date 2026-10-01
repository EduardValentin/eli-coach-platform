import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import {
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn";
import {
  DialogFrame,
  DialogFrameClose,
  DialogFrameDescription,
  DialogFrameTitle,
} from "../lib/dialog-frame";
import { Button } from "../primitives/button";
import { usePhotoGestures } from "./use-photo-gestures";

export type LightboxPhoto = {
  key: string;
  src: string;
  alt: string;
  label: string;
};

type LightboxLabels = {
  previous: string;
  next: string;
  close: string;
  position: (position: number, count: number) => string;
};

type LightboxProps = {
  photos: readonly LightboxPhoto[];
  currentKey: string | null;
  onCurrentKeyChange: (key: string | null) => void;
  description: ReactNode;
  labels: LightboxLabels;
};

type Zoom = { scale: 1 } | { scale: 2; origin: string };

const FITTED: Zoom = { scale: 1 };

function originUnder(event: PointerEvent<HTMLElement>, image: HTMLElement) {
  const frame = image.getBoundingClientRect();
  if (frame.width === 0 || frame.height === 0) return "center";

  const percentAlong = (offset: number, length: number) =>
    Math.min(100, Math.max(0, (offset / length) * 100));

  return `${percentAlong(event.clientX - frame.left, frame.width)}% ${percentAlong(event.clientY - frame.top, frame.height)}%`;
}

function photoAfter(
  photos: readonly LightboxPhoto[],
  { index, step }: { index: number; step: 1 | -1 },
): LightboxPhoto {
  return photos[(index + step + photos.length) % photos.length];
}

type PhotoStep = "previous" | "next";

const STEP_BUTTONS = {
  previous: { side: "left-3", Icon: ChevronLeft },
  next: { side: "right-3", Icon: ChevronRight },
} satisfies Record<PhotoStep, { side: string; Icon: typeof ChevronLeft }>;

function LightboxStepButton({
  label,
  onStep,
  step,
}: {
  label: string;
  onStep: () => void;
  step: PhotoStep;
}) {
  const { side, Icon } = STEP_BUTTONS[step];

  return (
    <Button
      aria-label={label}
      className={cn("absolute top-1/2 -translate-y-1/2", side)}
      data-parity={`lightbox-${step}`}
      onClick={onStep}
      size="icon-md"
      type="button"
      variant="outline"
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}

type StageProps = {
  labels: LightboxLabels;
  photo: LightboxPhoto;
  onNext: (() => void) | null;
  onPrevious: (() => void) | null;
};

function LightboxStage({ labels, photo, onNext, onPrevious }: StageProps) {
  const [zoom, setZoom] = useState<Zoom>(FITTED);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const toggleZoom = (event: PointerEvent<HTMLElement>) => {
    setZoom((current) =>
      current.scale === 1 && image
        ? { scale: 2, origin: originUnder(event, image) }
        : FITTED,
    );
  };

  const gestures = usePhotoGestures({
    onSwipeLeft: () => onNext?.(),
    onSwipeRight: () => onPrevious?.(),
    onDoubleTap: toggleZoom,
  });

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        className="flex min-w-0 flex-1 touch-pinch-zoom items-center justify-center overflow-hidden p-4 select-none sm:px-20"
        {...gestures}
      >
        <img
          alt={photo.alt}
          className={cn(
            "max-h-full max-w-full object-contain transition-transform duration-200 motion-reduce:transition-none",
            {
              "cursor-zoom-in": zoom.scale === 1,
              "cursor-zoom-out": zoom.scale === 2,
            },
          )}
          data-parity="lightbox-image"
          draggable={false}
          ref={setImage}
          src={photo.src}
          style={{
            transform: `scale(${zoom.scale})`,
            transformOrigin: zoom.scale === 2 ? zoom.origin : "center",
          }}
        />
      </div>

      {onPrevious && (
        <LightboxStepButton
          label={labels.previous}
          onStep={onPrevious}
          step="previous"
        />
      )}
      {onNext && (
        <LightboxStepButton label={labels.next} onStep={onNext} step="next" />
      )}
    </div>
  );
}

type ContentProps = Omit<LightboxProps, "currentKey"> & {
  photo: LightboxPhoto;
};

function LightboxContent({
  description,
  labels,
  onCurrentKeyChange,
  photo,
  photos,
}: ContentProps) {
  const index = photos.indexOf(photo);
  const browsable = photos.length > 1;
  const showNext = () =>
    onCurrentKeyChange(photoAfter(photos, { index, step: 1 }).key);
  const showPrevious = () =>
    onCurrentKeyChange(photoAfter(photos, { index, step: -1 }).key);
  const stepByKey: Partial<Record<string, () => void>> = {
    ArrowLeft: showPrevious,
    ArrowRight: showNext,
  };

  const stepWithArrowKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = browsable ? stepByKey[event.key] : undefined;
    if (!step) return;

    event.preventDefault();
    step();
  };

  return (
    <DialogFrame
      className="bg-surface-inverted text-text-inverted"
      data-parity-root="PhotoLightbox"
      data-surface="inverted"
      onKeyDown={stepWithArrowKeys}
      placement="screen"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="grid min-w-0 gap-1">
          <DialogFrameTitle data-parity="lightbox-title">
            {photo.label} ·{" "}
            <span data-parity="lightbox-counter">
              {labels.position(index + 1, photos.length)}
            </span>
          </DialogFrameTitle>
          <DialogFrameDescription className="text-text-inverted-secondary">
            {description}
          </DialogFrameDescription>
        </div>
        <DialogFrameClose asChild>
          <Button
            aria-label={labels.close}
            data-parity="lightbox-close"
            size="icon-md"
            type="button"
            variant="outline"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogFrameClose>
      </div>

      <LightboxStage
        key={photo.key}
        labels={labels}
        onNext={browsable ? showNext : null}
        onPrevious={browsable ? showPrevious : null}
        photo={photo}
      />
    </DialogFrame>
  );
}

export function Lightbox({ currentKey, ...content }: LightboxProps) {
  const photo = content.photos.find(
    (candidate) => candidate.key === currentKey,
  );

  return (
    <RadixDialog.Root
      onOpenChange={(open) => {
        if (!open) content.onCurrentKeyChange(null);
      }}
      open={photo !== undefined}
    >
      {photo && <LightboxContent {...content} photo={photo} />}
    </RadixDialog.Root>
  );
}
