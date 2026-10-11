import {
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_TAG_LENGTH,
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
  TagInput,
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
import {
  Controller,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";

import type { ClientResourceView } from "~/features/client-resources/public/client-resources";
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
  useResourceDetailsChange,
  type ResourceDetailsChangeOutcome,
} from "./use-resource-details-change";
import {
  useResourceUpload,
  type ResourceUploadOutcome,
  type ResourceUploadState,
} from "./use-resource-upload";

export type ResourceFormMode =
  | { kind: "add"; clientId: string }
  | { kind: "edit"; resource: ClientResourceView };

type Dismissal = NonNullable<
  ComponentProps<typeof ResponsiveSheetDialog>["dismissal"]
>;

type ResourceFormValues = {
  title: string;
  description: string;
  tags: string[];
};

type ChosenUpload = { file: File; kind: ResourceFileKind };

type ResourceFormState = "ready" | "blocked" | "busy";

const COPY = {
  add: {
    title: "Add resource",
    submit: "Add resource",
    sending: "Uploading…",
    failed: "The upload didn’t go through. Try again.",
    done: "Resource added.",
  },
  edit: {
    title: "Edit details",
    submit: "Save",
    sending: "Saving…",
    failed: "Your changes weren’t saved. Try again.",
    done: "Changes saved.",
  },
} as const satisfies Record<ResourceFormMode["kind"], Record<string, string>>;

const FIELD_COPY = {
  noTitle: "Give it a title.",
  titleTooLong: `Keep the title to ${MAX_RESOURCE_TITLE_LENGTH} characters.`,
  descriptionTooLong: `Keep the description to ${MAX_RESOURCE_DESCRIPTION_LENGTH.toLocaleString("en-GB")} characters.`,
  tagTooLong: `Keep each tag to ${MAX_RESOURCE_TAG_LENGTH} characters.`,
  tagPlaceholder: "Add a tag",
} as const;

const CANCEL = "Cancel";

const UPLOAD_COPY = {
  preparing: "Preparing pages…",
  noFile: "Choose a file to add.",
  preparingHint: "Large files can take a minute or two.",
  dropPrompt: "Drop a file here or choose one",
  replace: "Replace",
} as const;

const OPTIONAL_SUFFIX = [
  { parity: "description-optional", text: "(optional)" },
];

const TAGS_OPTIONAL_SUFFIX = [{ text: "(optional)" }];

type ResourceFormProps = {
  vocabulary: readonly string[];
  onClose: () => void;
  onDismissalChange: (dismissal: Dismissal) => void;
};

function dismissalWhile(state: ResourceFormState): Dismissal {
  return state === "busy" ? "locked" : "allowed";
}

function showDetailsProblems(
  form: UseFormReturn<ResourceFormValues>,
  problems: ResourceDetailsProblems,
) {
  if (problems.title) {
    form.setError("title", {
      message:
        problems.title === "missing"
          ? FIELD_COPY.noTitle
          : FIELD_COPY.titleTooLong,
    });
  }
  if (problems.description) {
    form.setError("description", { message: FIELD_COPY.descriptionTooLong });
  }
  if (problems.tags) {
    form.setError("tags", { message: FIELD_COPY.tagTooLong });
  }
}

function ResourceFormFrame({
  title,
  onSubmit,
  children,
}: {
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <>
      <SheetDialogHeader title={title} />

      <SheetDialogBody>
        <form className="grid gap-6" noValidate onSubmit={onSubmit}>
          {children}
        </form>
      </SheetDialogBody>
    </>
  );
}

function FileSize({ sizeBytes }: { sizeBytes: number }) {
  return (
    <p className="text-sm text-text-secondary tabular-nums">
      {formatFileSize(sizeBytes)}
    </p>
  );
}

function ResourceFileRow({
  kind,
  name,
  status,
  action,
}: {
  kind: ResourceFileKind;
  name: string;
  status: ReactNode;
  action?: ReactNode;
}) {
  const Glyph = RESOURCE_KIND_GLYPHS[kind];

  return (
    <div
      className="flex items-center gap-3 rounded-field border border-control-border-soft bg-surface-base p-3"
      data-parity="resource-file-row"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-field bg-surface-quiet text-text-secondary"
        data-parity="resource-file-glyph"
      >
        <Glyph className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        {status}
      </div>
      {action}
    </div>
  );
}

function ResourceDetailsFields({
  form,
  vocabulary,
}: {
  form: UseFormReturn<ResourceFormValues>;
  vocabulary: readonly string[];
}) {
  return (
    <>
      <FieldLayout
        error={form.formState.errors.title?.message}
        label="Title"
        labelLayout="inline"
      >
        {(controlAttributes) => (
          <Input
            {...controlAttributes}
            {...form.register("title", {
              validate: (title) =>
                title.trim().length > 0 || FIELD_COPY.noTitle,
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

      <FieldLayout
        data-parity="resource-tags-field"
        error={form.formState.errors.tags?.message}
        label="Tags"
        suffixes={TAGS_OPTIONAL_SUFFIX}
      >
        {(controlAttributes) => (
          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <TagInput
                {...controlAttributes}
                maxLength={MAX_RESOURCE_TAG_LENGTH}
                onChange={field.onChange}
                placeholder={FIELD_COPY.tagPlaceholder}
                ref={field.ref}
                value={field.value}
                vocabulary={vocabulary}
              />
            )}
          />
        )}
      </FieldLayout>
    </>
  );
}

function ResourceFormActions({
  state,
  submitLabel,
  onCancel,
}: {
  state: ResourceFormState;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <SheetDialogActions>
      <Button
        disabled={state !== "ready"}
        size="md"
        type="submit"
        variant="primary"
        width="full-below-sm"
      >
        {submitLabel}
      </Button>
      <Button
        disabled={state === "busy"}
        onClick={onCancel}
        size="md"
        variant="ghost"
        width="full-below-sm"
      >
        {CANCEL}
      </Button>
    </SheetDialogActions>
  );
}

function uploadSubmitLabelOf(upload: ResourceUploadState): string {
  if (upload.state === "sending") return COPY.add.sending;
  if (upload.state === "preparing") return UPLOAD_COPY.preparing;

  return COPY.add.submit;
}

function UploadStatus({
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
          {UPLOAD_COPY.preparingHint}
        </p>
      </>
    );
  }

  return <FileSize sizeBytes={file.size} />;
}

function useChosenResourceFile(form: UseFormReturn<ResourceFormValues>) {
  const [chosen, setChosen] = useState<ChosenUpload | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

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

  return { chosen, fileError, chooseFile, showFileError: setFileError };
}

function AddResourceForm({
  clientId,
  vocabulary,
  onClose,
  onDismissalChange,
}: ResourceFormProps & { clientId: string }) {
  const fileErrorId = useId();
  const [failed, setFailed] = useState(false);
  const form = useForm<ResourceFormValues>({
    defaultValues: { title: "", description: "", tags: [] },
  });
  const { chosen, fileError, chooseFile, showFileError } =
    useChosenResourceFile(form);

  const settle = (outcome: ResourceUploadOutcome) => {
    if (outcome.status === "added") {
      onClose();
      toast.success(COPY.add.done);
      return;
    }
    if (outcome.status === "refused") {
      showFileError(UPLOAD_REFUSAL_MESSAGES[outcome.refusal]);
      return;
    }
    if (outcome.status === "details-refused") {
      showDetailsProblems(form, outcome.problems);
      return;
    }
    setFailed(true);
  };

  const { upload, uploadState } = useResourceUpload(clientId, settle);
  const state: ResourceFormState =
    uploadState.state === "idle" ? "ready" : "busy";

  useEffect(() => {
    onDismissalChange(dismissalWhile(state));
  }, [state, onDismissalChange]);

  const save = form.handleSubmit((values) => {
    if (!chosen) return;

    setFailed(false);
    upload({
      file: chosen.file,
      title: values.title.trim(),
      description: values.description.trim(),
      tags: values.tags,
    });
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!chosen) showFileError(UPLOAD_COPY.noFile);
    return save(event);
  };

  const picker = {
    accept: RESOURCE_UPLOAD_ACCEPT,
    "aria-describedby": fileError ? fileErrorId : undefined,
    "aria-invalid": fileError !== null,
    onFileChosen: chooseFile,
  };

  return (
    <ResourceFormFrame onSubmit={submit} title={COPY.add.title}>
      <div className="grid gap-2">
        {chosen ? (
          <ResourceFileRow
            action={
              state === "ready" && (
                <FilePickerButton {...picker}>
                  {UPLOAD_COPY.replace}
                </FilePickerButton>
              )
            }
            kind={chosen.kind}
            name={chosen.file.name}
            status={<UploadStatus file={chosen.file} upload={uploadState} />}
          />
        ) : (
          <FileDropzone
            {...picker}
            hint={RESOURCE_UPLOAD_HINT}
            prompt={UPLOAD_COPY.dropPrompt}
          />
        )}
        <FieldError id={fileErrorId} message={fileError ?? undefined} />
      </div>

      <ResourceDetailsFields form={form} vocabulary={vocabulary} />

      {failed && <Alert>{COPY.add.failed}</Alert>}

      <ResourceFormActions
        onCancel={onClose}
        state={state}
        submitLabel={uploadSubmitLabelOf(uploadState)}
      />
    </ResourceFormFrame>
  );
}

function sameTagsInOrder(
  tags: readonly string[],
  stored: readonly string[],
): boolean {
  return (
    tags.length === stored.length &&
    tags.every((tag, index) => tag === stored[index])
  );
}

function saveGateOf(
  resource: ClientResourceView,
  [title, description, tags]: readonly [string, string, string[]],
): ResourceFormState {
  const trimmedTitle = title.trim();
  const changed =
    trimmedTitle !== resource.title ||
    description.trim() !== resource.description ||
    !sameTagsInOrder(tags, resource.tags);

  return trimmedTitle !== "" && changed ? "ready" : "blocked";
}

function EditResourceDetailsForm({
  resource,
  vocabulary,
  onClose,
  onDismissalChange,
}: ResourceFormProps & { resource: ClientResourceView }) {
  const [failed, setFailed] = useState(false);
  const form = useForm<ResourceFormValues>({
    defaultValues: {
      title: resource.title,
      description: resource.description,
      tags: [...resource.tags],
    },
  });
  const typed = useWatch({
    control: form.control,
    name: ["title", "description", "tags"],
  });

  const settle = (outcome: ResourceDetailsChangeOutcome) => {
    if (outcome.status === "changed") {
      onClose();
      toast.success(COPY.edit.done);
      return;
    }
    if (outcome.status === "details-refused") {
      showDetailsProblems(form, outcome.problems);
      return;
    }
    setFailed(true);
  };

  const { change, saving } = useResourceDetailsChange(resource.id, settle);
  const state: ResourceFormState = saving
    ? "busy"
    : saveGateOf(resource, typed);

  useEffect(() => {
    onDismissalChange(dismissalWhile(state));
  }, [state, onDismissalChange]);

  const save = form.handleSubmit((values) => {
    setFailed(false);
    change({
      title: values.title.trim(),
      description: values.description.trim(),
      tags: values.tags,
    });
  });

  return (
    <ResourceFormFrame onSubmit={save} title={COPY.edit.title}>
      <div className="grid gap-2">
        <ResourceFileRow
          kind={resource.file.kind}
          name={resource.file.downloadName}
          status={<FileSize sizeBytes={resource.file.sizeBytes} />}
        />
      </div>

      <ResourceDetailsFields form={form} vocabulary={vocabulary} />

      {failed && <Alert>{COPY.edit.failed}</Alert>}

      <ResourceFormActions
        onCancel={onClose}
        state={state}
        submitLabel={saving ? COPY.edit.sending : COPY.edit.submit}
      />
    </ResourceFormFrame>
  );
}

type ShownForm = { mode: ResourceFormMode; session: number };

function ResourceForm({
  mode,
  ...formProps
}: ResourceFormProps & { mode: ResourceFormMode }) {
  if (mode.kind === "edit") {
    return <EditResourceDetailsForm resource={mode.resource} {...formProps} />;
  }

  return <AddResourceForm clientId={mode.clientId} {...formProps} />;
}

type ResourceFormDialogProps = {
  mode: ResourceFormMode | null;
  vocabulary: readonly string[];
  onClose: () => void;
};

export function ResourceFormDialog({
  mode,
  vocabulary,
  onClose,
}: ResourceFormDialogProps) {
  const [shown, setShown] = useState<ShownForm | null>(null);
  const [dismissal, setDismissal] = useState<Dismissal>("allowed");

  if (mode !== null && mode !== shown?.mode) {
    setShown({ mode, session: (shown?.session ?? 0) + 1 });
  }

  return (
    <ResponsiveSheetDialog
      dismissal={dismissal}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={mode !== null}
      title={COPY[shown?.mode.kind ?? "add"].title}
    >
      {shown && (
        <ResourceForm
          key={shown.session}
          mode={shown.mode}
          onClose={onClose}
          onDismissalChange={setDismissal}
          vocabulary={vocabulary}
        />
      )}
    </ResponsiveSheetDialog>
  );
}
