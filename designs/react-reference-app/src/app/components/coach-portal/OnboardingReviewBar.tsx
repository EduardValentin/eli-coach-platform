import { useId, useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const NOTE_LABEL = 'What is missing?';

function flaggedCountLabel(count: number): string {
  return count === 1 ? '1 question flagged' : `${count} questions flagged`;
}

export function OnboardingReviewBar({
  flagged,
  onSend,
  onDone,
}: {
  flagged: readonly string[];
  onSend: (note: string) => void;
  onDone: () => void;
}) {
  const noteId = useId();
  const [note, setNote] = useState('');
  const ready = flagged.length > 0 && note.trim().length > 0;

  return (
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 space-y-4 rounded-b-panel border-t border-border-subtle bg-surface-base px-6 pt-4 pb-6">
      <div className="space-y-2">
        <Label htmlFor={noteId}>{NOTE_LABEL}</Label>
        <Textarea
          id={noteId}
          required
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className="text-sm text-text-secondary">
          {flaggedCountLabel(flagged.length)}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button disabled={!ready} onClick={() => onSend(note.trim())}>
            Ask for more details
          </Button>
          <Button variant="outline" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
