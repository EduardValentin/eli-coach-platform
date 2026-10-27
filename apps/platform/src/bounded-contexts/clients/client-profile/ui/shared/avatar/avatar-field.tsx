import {
  ACCEPTED_PROGRESS_PHOTO_TYPES,
  ClientAvatar,
} from "@eli-coach-platform/domain/client-profile";
import { cn, VALUE_LG_CLASS } from "~/shared/design-system/lib";
import { ConfirmDialog } from "~/shared/design-system/overlays";
import {
  Avatar,
  Button,
  cardVariants,
  FilePickerButton,
} from "~/shared/design-system/primitives";
import { toast } from "~/shared/design-system/toast";
import { Camera, Trash2 } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useFetcher } from "react-router";

import {
  CLIENT_AVATAR_FIELD,
  clientAvatarRefusalSchema,
  clientAvatarWrittenAnswerSchema,
} from "~/bounded-contexts/clients/client-profile/public/client-avatar";

import { clientAvatarSrc } from "./client-avatar-src";

type AvatarFieldProps = {
  clientName: string;
  email: string;
  avatarUrl: string | null;
  avatarEndpoint: string;
};

type AvatarWrite = "upload" | "removal";

const REFUSED_PICTURE_MESSAGE = "Choose a JPEG, PNG or WebP under 10 MB.";

const UNSAVED_PICTURE_MESSAGE = "The picture wasn't saved. Try again.";

const SAVED_MESSAGES: Record<AvatarWrite, string> = {
  upload: "Profile picture updated",
  removal: "Profile picture removed",
};

const REFUSED_PICTURE_ERRORS = new Set([
  "not-accepted",
  "rendition-refused",
  "too-large",
]);

function failureMessageOf(answer: unknown): string {
  const refusal = clientAvatarRefusalSchema.safeParse(answer);

  return refusal.success && REFUSED_PICTURE_ERRORS.has(refusal.data.error)
    ? REFUSED_PICTURE_MESSAGE
    : UNSAVED_PICTURE_MESSAGE;
}

function useAvatarWrites(avatarEndpoint: string) {
  const { data, submit } = useFetcher<unknown>();
  const pendingWrite = useRef<AvatarWrite | null>(null);

  const settle = useEffectEvent((answer: unknown) => {
    const write = pendingWrite.current;
    pendingWrite.current = null;

    if (!write) return;

    if (clientAvatarWrittenAnswerSchema.safeParse(answer).success) {
      toast.success(SAVED_MESSAGES[write]);
      return;
    }

    toast.error(failureMessageOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const upload = (file: File) => {
    if (pendingWrite.current) return;

    const formData = new FormData();
    formData.append(CLIENT_AVATAR_FIELD, file);
    pendingWrite.current = "upload";
    void submit(formData, {
      action: avatarEndpoint,
      encType: "multipart/form-data",
      method: "post",
    });
  };

  const remove = () => {
    if (pendingWrite.current) return;

    pendingWrite.current = "removal";
    void submit(null, { action: avatarEndpoint, method: "delete" });
  };

  return { upload, remove };
}

export function AvatarField({
  clientName,
  email,
  avatarUrl,
  avatarEndpoint,
}: AvatarFieldProps) {
  const headingId = useId();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const writes = useAvatarWrites(avatarEndpoint);

  const choose = (file: File) => {
    if (!ClientAvatar.accepts({ mimeType: file.type, sizeBytes: file.size })) {
      toast.error(REFUSED_PICTURE_MESSAGE);
      return;
    }

    writes.upload(file);
  };

  const remove = () => {
    setConfirmingRemoval(false);
    writes.remove();
  };

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        cardVariants({ variant: "panel" }),
        "flex flex-col items-center gap-6 p-6 sm:flex-row lg:p-8",
      )}
      data-parity="avatar-field"
      data-parity-root="AvatarField"
    >
      <Avatar
        data-parity="avatar"
        imageAlt={`${clientName}'s profile picture`}
        imageUrl={clientAvatarSrc(avatarUrl)}
        name={clientName}
        size="lg"
      />

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h2 className={VALUE_LG_CLASS} data-parity="avatar-name" id={headingId}>
          {clientName}
        </h2>
        <p
          className="mt-1 mb-4 text-sm text-text-secondary"
          data-parity="avatar-detail"
        >
          {email}
        </p>

        <div
          className="flex flex-wrap justify-center gap-3 sm:justify-start"
          data-parity="avatar-actions"
        >
          {avatarUrl && (
            <Button
              onClick={() => setConfirmingRemoval(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" size={16} />
              Remove
            </Button>
          )}
          <FilePickerButton
            accept={ACCEPTED_PROGRESS_PHOTO_TYPES.join(",")}
            icon={Camera}
            onFileChosen={choose}
            size="sm"
          >
            {avatarUrl ? "Change picture" : "Upload picture"}
          </FilePickerButton>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Remove"
        description="Initials show in its place."
        onConfirm={remove}
        onOpenChange={setConfirmingRemoval}
        open={confirmingRemoval}
        title="Remove the profile picture?"
        tone="destructive"
      />
    </section>
  );
}
