import { useId, useRef, useState, type ReactNode } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { isAcceptedProgressPhoto, PROGRESS_PHOTO_TYPES } from '../domain/measurements';
import { getInitials } from '../utils/clientHelpers';
import { FilePickerButton } from './FileDropzone';
import { VALUE_LG_CLASS } from './typography';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { cardVariants } from './ui/card';
import { ConfirmDialog } from './ui/confirm-dialog';
import { cn } from './ui/utils';

const REFUSED_PICTURE_MESSAGE = 'Choose a JPEG, PNG or WebP under 10 MB.';
const UNSAVED_PICTURE_MESSAGE = "The picture wasn't saved. Try again.";

type AvatarFieldProps = {
  name: string;
  detail: ReactNode;
  avatarUrl: string | null;
  onChange: (avatarUrl: string | null) => Promise<void>;
};

export function AvatarField({ name, detail, avatarUrl, onChange }: AvatarFieldProps) {
  const headingId = useId();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const saving = useRef(false);

  const save = async (next: string | null, savedMessage: string) => {
    if (saving.current) return;
    saving.current = true;
    try {
      await onChange(next);
      toast.success(savedMessage);
    } catch {
      toast.error(UNSAVED_PICTURE_MESSAGE);
    } finally {
      saving.current = false;
    }
  };

  const choose = (file: File) => {
    if (!isAcceptedProgressPhoto(file)) {
      toast.error(REFUSED_PICTURE_MESSAGE);
      return;
    }
    void save(URL.createObjectURL(file), 'Profile picture updated');
  };

  const remove = () => {
    setConfirmingRemoval(false);
    void save(null, 'Profile picture removed');
  };

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        cardVariants({ variant: 'panel' }),
        'flex flex-col items-center gap-6 p-6 sm:flex-row lg:p-8',
      )}
      data-parity="avatar-field"
    >
      <Avatar size="lg" data-parity="avatar">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={`${name}'s profile picture`} />}
        <AvatarFallback aria-hidden="true">{getInitials(name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h2 id={headingId} className={VALUE_LG_CLASS} data-parity="avatar-name">
          {name}
        </h2>
        <p className="mt-1 mb-4 text-sm text-text-secondary" data-parity="avatar-detail">
          {detail}
        </p>

        <div className="flex flex-wrap justify-center gap-3 sm:justify-start" data-parity="avatar-actions">
          {avatarUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingRemoval(true)}>
              <Trash2 aria-hidden="true" size={16} />
              Remove
            </Button>
          )}
          <FilePickerButton
            accept={PROGRESS_PHOTO_TYPES.join(',')}
            icon={Camera}
            onFileChosen={choose}
            size="sm"
          >
            {avatarUrl ? 'Change picture' : 'Upload picture'}
          </FilePickerButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingRemoval}
        onOpenChange={setConfirmingRemoval}
        title="Remove the profile picture?"
        description="Initials show in its place."
        confirmLabel="Remove"
        tone="destructive"
        onConfirm={remove}
      />
    </section>
  );
}
