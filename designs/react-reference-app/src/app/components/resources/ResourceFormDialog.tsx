import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  checkResourceUpload,
  detailsDiffer,
  RESOURCE_UPLOAD_ACCEPT,
  resourceDetailsFrom,
  titleFromFileName,
  type Resource,
  type ResourceAddition,
  type ResourceDetails,
  type ResourceFileKind,
  type ServerDecidedRefusal,
} from '../../domain/resources';
import type { NewResourceUpload } from '../../hooks/useClientResources';
import { FIELD_ERROR_CLASS } from '../../utils/formFieldStyles';
import {
  formatFileSize,
  RESOURCE_UPLOAD_HINT,
  UPLOAD_REFUSAL_MESSAGES,
} from '../../utils/resourceLabels';
import { FileDropzone, FilePickerButton } from '../FileDropzone';
import { TagInput } from '../TagInput';
import { RESOURCE_KIND_GLYPHS } from './ResourceFileCover';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import {
  ResponsiveSheetDialog,
  SheetDialogActions,
  SheetDialogBody,
  SheetDialogHeader,
} from '../workout/ResponsiveSheetDialog';

export type ResourceFormMode =
  | {
      kind: 'add';
      onAdd: (
        upload: NewResourceUpload,
        onProgress: (fraction: number) => void,
      ) => Promise<ResourceAddition>;
    }
  | { kind: 'edit'; resource: Resource; onSave: (details: ResourceDetails) => Promise<Resource> };

type ResourceFormValues = { title: string; description: string; tags: string[] };

type Submission =
  | { state: 'idle' }
  | { state: 'sending'; progress: number }
  | { state: 'preparing' }
  | { state: 'failed' };

const IDLE: Submission = { state: 'idle' };

function isBusy(submission: Submission): boolean {
  return submission.state === 'sending' || submission.state === 'preparing';
}

function submissionAt(progress: number): Submission {
  return progress < 1 ? { state: 'sending', progress } : { state: 'preparing' };
}

type FileRowState =
  | { state: 'chosen' }
  | { state: 'sending'; progress: number }
  | { state: 'preparing' };

const FILE_CHOSEN: FileRowState = { state: 'chosen' };

function fileRowStateOf(submission: Submission): FileRowState {
  if (submission.state === 'sending' || submission.state === 'preparing') return submission;

  return FILE_CHOSEN;
}

const COPY = {
  add: {
    title: 'Add resource',
    submit: 'Add resource',
    sending: 'Uploading…',
    failed: 'The upload didn’t go through. Try again.',
    done: 'Resource added.',
  },
  edit: {
    title: 'Edit details',
    submit: 'Save',
    sending: 'Saving…',
    failed: 'Your changes weren’t saved. Try again.',
    done: 'Changes saved.',
  },
} as const;

const NO_FILE_MESSAGE = 'Choose a file to add.';

const PREPARING_LABEL = 'Preparing pages…';

type FormCopy = (typeof COPY)[keyof typeof COPY];

function submitLabelOf(submission: Submission, copy: FormCopy): string {
  if (submission.state === 'sending') return copy.sending;
  if (submission.state === 'preparing') return PREPARING_LABEL;

  return copy.submit;
}

type ChosenFile = { name: string; sizeBytes: number; kind: ResourceFileKind };

type ChosenUpload = { file: File; kind: ResourceFileKind };

const PREPARING_HINT = 'Large files can take a minute or two.';

function FileRowStatus({ file, row }: { file: ChosenFile; row: FileRowState }) {
  const hintId = useId();

  if (row.state === 'sending') {
    return (
      <Progress aria-label="Upload progress" className="h-1.5" value={row.progress * 100} />
    );
  }
  if (row.state === 'preparing') {
    return (
      <>
        <Progress aria-describedby={hintId} aria-label="Preparing pages" className="h-1.5" />
        <p className="text-sm text-text-secondary" id={hintId}>
          {PREPARING_HINT}
        </p>
      </>
    );
  }

  return (
    <p className="text-sm text-text-secondary tabular-nums">{formatFileSize(file.sizeBytes)}</p>
  );
}

function ResourceFileRow({
  file,
  row,
  action,
}: {
  file: ChosenFile;
  row: FileRowState;
  action?: ReactNode;
}) {
  const Glyph = RESOURCE_KIND_GLYPHS[file.kind];

  return (
    <div
      className="flex items-center gap-3 rounded-field border border-control-border-soft bg-surface-base p-3"
      data-parity="resource-file-row"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-field bg-surface-quiet text-text-secondary"
      >
        <Glyph className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
        <FileRowStatus file={file} row={row} />
      </div>
      {row.state === 'chosen' && action}
    </div>
  );
}

function FileFieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;

  return (
    <p className={FIELD_ERROR_CLASS} id={id}>
      {message}
    </p>
  );
}

function ResourceForm({
  mode,
  vocabulary,
  submission,
  onSubmissionChange,
  onClose,
}: {
  mode: ResourceFormMode;
  vocabulary: readonly string[];
  submission: Submission;
  onSubmissionChange: (submission: Submission) => void;
  onClose: () => void;
}) {
  const fileInputId = useId();
  const fileErrorId = useId();
  const editing = mode.kind === 'edit' ? mode.resource : null;
  const copy = COPY[mode.kind];
  const [upload, setUpload] = useState<ChosenUpload | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<ResourceFormValues>({
    defaultValues: {
      title: editing?.title ?? '',
      description: editing?.description ?? '',
      tags: [...(editing?.tags ?? [])],
    },
  });
  const values = form.watch();
  const busy = isBusy(submission);
  const typedDetails = resourceDetailsFrom(values);
  const unchanged =
    editing !== null && (typedDetails === null || !detailsDiffer(editing, typedDetails));

  const chooseFile = (candidate: File) => {
    const check = checkResourceUpload(candidate);
    if (!check.accepted) {
      setFileError(UPLOAD_REFUSAL_MESSAGES[check.refusal]);
      return;
    }

    const title = form.getValues('title');
    const suggestedTitle = upload ? titleFromFileName(upload.file.name) : '';
    if (title.trim() === '' || title === suggestedTitle) {
      form.setValue('title', titleFromFileName(candidate.name), {
        shouldValidate: form.formState.isSubmitted,
      });
    }
    setFileError(null);
    setUpload({ file: candidate, kind: check.kind });
  };

  const addChosenFile = async (details: ResourceDetails): Promise<ServerDecidedRefusal | null> => {
    if (mode.kind !== 'add' || !upload) throw new Error(NO_FILE_MESSAGE);

    const addition = await mode.onAdd({ file: upload.file, details }, (progress) =>
      onSubmissionChange(submissionAt(progress)),
    );

    return addition.status === 'refused' ? addition.refusal : null;
  };

  const save = form.handleSubmit(async (formValues) => {
    const details = resourceDetailsFrom(formValues);
    if (!details || (mode.kind === 'add' && !upload)) return;

    onSubmissionChange({ state: 'sending', progress: 0 });
    let refusal: ServerDecidedRefusal | null = null;
    try {
      if (mode.kind === 'edit') {
        await mode.onSave(details);
      } else {
        refusal = await addChosenFile(details);
      }
    } catch {
      onSubmissionChange({ state: 'failed' });
      return;
    }
    if (refusal) {
      setFileError(UPLOAD_REFUSAL_MESSAGES[refusal]);
      onSubmissionChange(IDLE);
      return;
    }
    onClose();
    toast.success(copy.done);
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (mode.kind === 'add' && !upload) setFileError(NO_FILE_MESSAGE);
    return save(event);
  };

  const chosenFile: ChosenFile | null =
    editing?.file ??
    (upload && { name: upload.file.name, sizeBytes: upload.file.size, kind: upload.kind });

  return (
    <>
      <SheetDialogHeader title={copy.title} />

      <SheetDialogBody>
        <Form {...form}>
          <form className="grid gap-6" noValidate onSubmit={submit}>
            <div className="grid gap-2">
              {chosenFile ? (
                <ResourceFileRow
                  action={
                    editing ? undefined : (
                      <FilePickerButton
                        accept={RESOURCE_UPLOAD_ACCEPT}
                        aria-describedby={fileError ? fileErrorId : undefined}
                        aria-invalid={fileError !== null}
                        onFileChosen={chooseFile}
                      >
                        Replace
                      </FilePickerButton>
                    )
                  }
                  file={chosenFile}
                  row={editing ? FILE_CHOSEN : fileRowStateOf(submission)}
                />
              ) : (
                <FileDropzone
                  accept={RESOURCE_UPLOAD_ACCEPT}
                  aria-describedby={fileError ? fileErrorId : undefined}
                  aria-invalid={fileError !== null}
                  hint={RESOURCE_UPLOAD_HINT}
                  id={fileInputId}
                  onFileChosen={chooseFile}
                  prompt="Drop a file here or choose one"
                />
              )}
              <FileFieldError id={fileErrorId} message={fileError} />
            </div>

            <FormField
              control={form.control}
              name="title"
              rules={{ validate: (title) => title.trim().length > 0 || 'Give it a title.' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-wrap items-baseline gap-1.5">
                    Description
                    <span className="font-normal text-text-secondary">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-24" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-wrap items-baseline gap-1.5">
                    Tags
                    <span className="font-normal text-text-secondary">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <TagInput
                      onChange={field.onChange}
                      placeholder="Add a tag"
                      ref={field.ref}
                      value={field.value}
                      vocabulary={vocabulary}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {submission.state === 'failed' && <Alert>{copy.failed}</Alert>}

            <SheetDialogActions>
              <Button
                className="w-full sm:w-auto"
                disabled={busy || unchanged}
                size="md"
                type="submit"
                variant="primary"
              >
                {submitLabelOf(submission, copy)}
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={onClose}
                size="md"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
            </SheetDialogActions>
          </form>
        </Form>
      </SheetDialogBody>
    </>
  );
}

export function ResourceFormDialog({
  mode,
  vocabulary,
  onClose,
}: {
  mode: ResourceFormMode | null;
  vocabulary: readonly string[];
  onClose: () => void;
}) {
  const [shown, setShown] = useState<{ mode: ResourceFormMode; session: number } | null>(null);
  const [submission, setSubmission] = useState<Submission>(IDLE);
  if (mode !== null && mode !== shown?.mode) {
    setShown({ mode, session: (shown?.session ?? 0) + 1 });
    setSubmission(IDLE);
  }

  return (
    <ResponsiveSheetDialog
      dismissal={isBusy(submission) ? 'locked' : 'allowed'}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={mode !== null}
      title={COPY[shown?.mode.kind ?? 'add'].title}
    >
      {shown && (
        <ResourceForm
          key={shown.session}
          mode={shown.mode}
          onClose={onClose}
          onSubmissionChange={setSubmission}
          submission={submission}
          vocabulary={vocabulary}
        />
      )}
    </ResponsiveSheetDialog>
  );
}
