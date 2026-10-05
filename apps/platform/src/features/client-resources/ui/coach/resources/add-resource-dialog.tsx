import {
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_TITLE_LENGTH,
  type ResourceDetailsProblems,
  type ResourceFileKind,
} from "@eli-coach-platform/domain/client-resources";
import {
  ResponsiveSheetDialog,
  SheetDialogActions,
  SheetDialogBody,
  SheetDialogHeader,
} from "@eli-coach-platform/ui/layout";
import {
  Alert,
  Button,
  FieldError,
  FieldLayout,
  FileDropzone,
  FilePickerButton,
  Input,
  Progress,
  Textarea,
} from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import {
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import {
  formatFileSize,
  RESOURCE_UPLOAD_HINT,
  UPLOAD_REFUSAL_MESSAGES,
} from "~/features/client-resources/ui/shared/resources/resource-copy";
import { RESOURCE_KIND_GLYPHS } from "~/features/client-resources/ui/shared/resources/resource-file-cover";

import {
  checkResourceUpload,
  RESOURCE_UPLOAD_ACCEPT,
  titleFromFileName,
} from "./resource-upload-check";
import {
  useResourceUpload,
  type ResourceUploadOutcome,
  type ResourceUploadState,
} from "./use-resource-upload";

type Dismissal = NonNullable<
  ComponentProps<typeof ResponsiveSheetDialog>["dismissal"]
>;

type ResourceFormValues = { title: string; description: string };

type ChosenUpload = { file: File; kind: ResourceFileKind };

const COPY = {
  title: "Add resource",
  submit: "Add resource",
  sending: "Uploading…",
  preparing: "Preparing pages…",
  failed: "The upload didn’t go through. Try again.",
  done: "Resource added.",
  noFile: "Choose a file to add.",
  noTitle: "Give it a title.",
  titleTooLong: `Keep the title to ${MAX_RESOURCE_TITLE_LENGTH} characters.`,
  descriptionTooLong: `Keep the description to ${MAX_RESOURCE_DESCRIPTION_LENGTH.toLocaleString("en-GB")} characters.`,
  preparingHint: "Large files can take a minute or two.",
  dropPrompt: "Drop a file here or choose one",
  replace: "Replace",
  cancel: "Cancel",
} as const;

const OPTIONAL_SUFFIX = [{ text: "(optional)" }];

function submitLabelOf(upload: ResourceUploadState): string {
  if (upload.state === "sending") return COPY.sending;
  if (upload.state === "preparing") return COPY.preparing;

  return COPY.submit;
}

function FileRowStatus({
  file,
  upload,
}: {
  file: File;
  upload: ResourceUploadState;
}) {
  const hintId = useId();

  if (upload.state === "sending") {
    return (
      <Progress
        aria-label="Upload progress"
        className="h-1.5"
        value={upload.fraction * 100}
      />
    );
  }
  if (upload.state === "preparing") {
    return (
      <>
        <Progress
          aria-describedby={hintId}
          aria-label="Preparing pages"
          className="h-1.5"
        />
        <p className="text-sm text-text-secondary" id={hintId}>
          {COPY.preparingHint}
        </p>
      </>
    );
  }

  return (
    <p className="text-sm text-text-secondary tabular-nums">
      {formatFileSize(file.size)}
    </p>
  );
}

function ResourceFileRow({
  chosen,
  upload,
  action,
}: {
  chosen: ChosenUpload;
  upload: ResourceUploadState;
  action: ReactNode;
}) {
  const Glyph = RESOURCE_KIND_GLYPHS[chosen.kind];

  return (
    <div className="flex items-center gap-3 rounded-field border border-control-border-soft bg-surface-base p-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-field bg-surface-quiet text-text-secondary"
      >
        <Glyph className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {chosen.file.name}
        </p>
        <FileRowStatus file={chosen.file} upload={upload} />
      </div>
      {upload.state === "idle" && action}
    </div>
  );
}

function showDetailsProblems(
  form: UseFormReturn<ResourceFormValues>,
  problems: ResourceDetailsProblems,
) {
  if (problems.title) {
    form.setError("title", {
      message: problems.title === "missing" ? COPY.noTitle : COPY.titleTooLong,
    });
  }
  if (problems.description) {
    form.setError("description", { message: COPY.descriptionTooLong });
  }
}

type AddResourceFormProps = {
  clientId: string;
  onClose: () => void;
  onDismissalChange: (dismissal: Dismissal) => void;
};

function AddResourceForm({
  clientId,
  onClose,
  onDismissalChange,
}: AddResourceFormProps) {
  const fileErrorId = useId();
  const [chosen, setChosen] = useState<ChosenUpload | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const form = useForm<ResourceFormValues>({
    defaultValues: { title: "", description: "" },
  });

  const settle = (outcome: ResourceUploadOutcome) => {
    if (outcome.status === "added") {
      onClose();
      toast.success(COPY.done);
      return;
    }
    if (outcome.status === "refused") {
      setFileError(UPLOAD_REFUSAL_MESSAGES[outcome.refusal]);
      return;
    }
    if (outcome.status === "details-refused") {
      showDetailsProblems(form, outcome.problems);
      return;
    }
    setFailed(true);
  };

  const { upload, uploadState } = useResourceUpload(clientId, settle);
  const busy = uploadState.state !== "idle";

  useEffect(() => {
    onDismissalChange(busy ? "locked" : "allowed");
  }, [busy, onDismissalChange]);

  const chooseFile = (candidate: File) => {
    const check = checkResourceUpload(candidate);
    if (!check.accepted) {
      setFileError(UPLOAD_REFUSAL_MESSAGES[check.refusal]);
      return;
    }

    const title = form.getValues("title");
    const suggestedTitle = chosen ? titleFromFileName(chosen.file.name) : "";
    if (title.trim() === "" || title === suggestedTitle) {
      form.setValue("title", titleFromFileName(candidate.name), {
        shouldValidate: form.formState.isSubmitted,
      });
    }
    setFileError(null);
    setChosen({ file: candidate, kind: check.kind });
  };

  const save = form.handleSubmit((values) => {
    if (!chosen) return;

    setFailed(false);
    upload({
      file: chosen.file,
      title: values.title.trim(),
      description: values.description.trim(),
    });
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!chosen) setFileError(COPY.noFile);
    return save(event);
  };

  const picker = {
    accept: RESOURCE_UPLOAD_ACCEPT,
    "aria-describedby": fileError ? fileErrorId : undefined,
    "aria-invalid": fileError !== null,
    onFileChosen: chooseFile,
  };

  return (
    <>
      <SheetDialogHeader title={COPY.title} />

      <SheetDialogBody>
        <form className="grid gap-6" noValidate onSubmit={submit}>
          <div className="grid gap-2">
            {chosen ? (
              <ResourceFileRow
                action={
                  <FilePickerButton {...picker}>
                    {COPY.replace}
                  </FilePickerButton>
                }
                chosen={chosen}
                upload={uploadState}
              />
            ) : (
              <FileDropzone
                {...picker}
                hint={RESOURCE_UPLOAD_HINT}
                prompt={COPY.dropPrompt}
              />
            )}
            <FieldError id={fileErrorId} message={fileError ?? undefined} />
          </div>

          <FieldLayout
            error={form.formState.errors.title?.message}
            label="Title"
            labelLayout="inline"
          >
            {(controlAttributes) => (
              <Input
                {...controlAttributes}
                {...form.register("title", {
                  validate: (title) => title.trim().length > 0 || COPY.noTitle,
                })}
                autoComplete="off"
                maxLength={MAX_RESOURCE_TITLE_LENGTH}
              />
            )}
          </FieldLayout>

          <FieldLayout
            error={form.formState.errors.description?.message}
            label="Description"
            suffixes={OPTIONAL_SUFFIX}
          >
            {(controlAttributes) => (
              <Textarea
                {...controlAttributes}
                {...form.register("description")}
                className="min-h-24"
                maxLength={MAX_RESOURCE_DESCRIPTION_LENGTH}
              />
            )}
          </FieldLayout>

          {failed && <Alert>{COPY.failed}</Alert>}

          <SheetDialogActions>
            <Button
              className="w-full sm:w-auto"
              disabled={busy}
              size="md"
              type="submit"
              variant="primary"
            >
              {submitLabelOf(uploadState)}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={onClose}
              size="md"
              variant="ghost"
            >
              {COPY.cancel}
            </Button>
          </SheetDialogActions>
        </form>
      </SheetDialogBody>
    </>
  );
}

type AddResourceDialogProps = {
  clientId: string;
  session: number;
  open: boolean;
  onClose: () => void;
};

export function AddResourceDialog({
  clientId,
  session,
  open,
  onClose,
}: AddResourceDialogProps) {
  const [dismissal, setDismissal] = useState<Dismissal>("allowed");

  return (
    <ResponsiveSheetDialog
      dismissal={dismissal}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
      title={COPY.title}
    >
      {session > 0 && (
        <AddResourceForm
          clientId={clientId}
          key={session}
          onClose={onClose}
          onDismissalChange={setDismissal}
        />
      )}
    </ResponsiveSheetDialog>
  );
}
