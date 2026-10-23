import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
  type Ref,
} from 'react';
import { Upload, type LucideIcon } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { cn } from './ui/utils';

type FilePickerProps = {
  accept: string;
  onFileChosen: (file: File) => void;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

type NamedFileInputProps = FilePickerProps & {
  inputRef?: Ref<HTMLInputElement>;
  labelledBy?: string;
  label?: string;
  describedBy: readonly (string | undefined)[];
};

function takeChosenFile(event: ChangeEvent<HTMLInputElement>): File | undefined {
  const file = event.target.files?.[0];
  event.target.value = '';

  return file;
}

function joinedIds(ids: readonly (string | undefined)[]): string | undefined {
  const present = ids.filter((id): id is string => Boolean(id));

  return present.length > 0 ? present.join(' ') : undefined;
}

function HiddenFileInput(props: NamedFileInputProps) {
  return (
    <input
      accept={props.accept}
      aria-describedby={joinedIds(props.describedBy)}
      aria-invalid={props['aria-invalid']}
      aria-label={props.label}
      aria-labelledby={props.labelledBy}
      className="sr-only"
      onChange={(event) => {
        const file = takeChosenFile(event);
        if (file) props.onFileChosen(file);
      }}
      ref={props.inputRef}
      type="file"
    />
  );
}

type FileDropzoneProps = FilePickerProps & { prompt: string; hint: string };

export const FileDropzone = forwardRef<HTMLInputElement, FileDropzoneProps>(function FileDropzone(
  { prompt, hint, ...picker },
  ref,
) {
  const promptId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const invalid = picker['aria-invalid'] === true;

  const allowDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const leave = (event: DragEvent<HTMLLabelElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) picker.onFileChosen(file);
  };

  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-field border border-dashed bg-surface-quiet px-4 py-8 text-center transition-colors hover:bg-surface-muted',
        {
          'border-control-border-soft': !dragging && !invalid,
          'border-destructive': !dragging && invalid,
          'border-primary bg-primary-soft hover:bg-primary-soft': dragging,
        },
      )}
      data-chip-control=""
      data-dragging={dragging ? '' : undefined}
      onDragEnter={allowDrop}
      onDragLeave={leave}
      onDragOver={allowDrop}
      onDrop={drop}
    >
      <HiddenFileInput
        {...picker}
        describedBy={[hintId, picker['aria-describedby']]}
        inputRef={ref}
        labelledBy={promptId}
      />
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-surface-base text-text-secondary shadow-card"
      >
        <Upload className="size-5" />
      </span>
      <span
        className="text-sm font-medium text-text-primary"
        data-parity="dropzone-prompt"
        id={promptId}
      >
        {prompt}
      </span>
      <span className="text-sm text-text-secondary" id={hintId}>
        {hint}
      </span>
    </label>
  );
});

type FilePickerButtonSize = 'xs' | 'sm';

export function FilePickerButton({
  children,
  size = 'xs',
  icon: Icon,
  ...picker
}: FilePickerProps & { children: string; size?: FilePickerButtonSize; icon?: LucideIcon }) {
  return (
    <label
      className={buttonVariants({
        variant: 'outline',
        size,
        className: 'cursor-pointer',
      })}
      data-chip-control=""
    >
      <HiddenFileInput
        {...picker}
        describedBy={[picker['aria-describedby']]}
        label={children}
      />
      {Icon && <Icon aria-hidden="true" size={16} />}
      <span aria-hidden="true">{children}</span>
    </label>
  );
}
