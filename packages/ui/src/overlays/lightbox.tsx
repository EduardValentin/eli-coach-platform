import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { KeyboardEvent, ReactNode } from "react";

import { cn } from "../lib/cn";
import {
  DialogFrame,
  DialogFrameClose,
  DialogFrameDescription,
  DialogFrameTitle,
} from "../lib/dialog-frame";
import { Button } from "../primitives/button";
import { ZoomableImage } from "./zoomable-image";

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

function neighbourPhoto(
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
  return (
    <div className="relative flex min-h-0 flex-1">
      <ZoomableImage
        alt={photo.alt}
        className="flex-1 p-4 sm:px-20"
        onSwipeLeft={() => onNext?.()}
        onSwipeRight={() => onPrevious?.()}
        parity={{ stage: "lightbox-stage", image: "lightbox-image" }}
        src={photo.src}
      />

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
    onCurrentKeyChange(neighbourPhoto(photos, { index, step: 1 }).key);
  const showPrevious = () =>
    onCurrentKeyChange(neighbourPhoto(photos, { index, step: -1 }).key);
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
