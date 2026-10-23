import { useId, useState } from 'react';
import { Users } from 'lucide-react';
import type { ClientJourney } from '../../../domain/journey';
import { BLOCK_TYPE_LABELS, currentVersion, type Program, type ProgramVersion, type Session } from '../../../domain/program';
import { EmptyState } from '../../EmptyState';
import { ResponsiveSheetDialog, SheetDialogActions, SheetDialogBody, SheetDialogHeader } from '../../ResponsiveSheetDialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

type CopyBlockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  journeys: Record<string, ClientJourney>;
  onCopy: (sessions: Session[]) => void;
};

function clientName(program: Program, journeys: Record<string, ClientJourney>): string {
  const identity = journeys[program.callId]?.profile.identity;
  return identity ? `${identity.firstName} ${identity.lastName}` : program.callId;
}

function versionsWithBlocks(program: Program): ProgramVersion[] {
  return program.versions.filter(version => version.content.plan.blocks.length > 0);
}

function Field({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CopyBlockForm({ programs, journeys, onCopy, onCancel }: Omit<CopyBlockDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [callId, setCallId] = useState(programs[0].callId);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const program = programs.find(other => other.callId === callId) ?? programs[0];
  const versions = versionsWithBlocks(program);
  const preferred = currentVersion(program);
  const version = versions.find(other => other.number === versionNumber) ?? versions.find(other => other.number === preferred?.number) ?? versions[0];
  const blocks = version.content.plan.blocks;
  const block = blocks.find(other => other.id === blockId) ?? blocks[0];

  return (
    <form
      className="grid gap-5"
      onSubmit={event => {
        event.preventDefault();
        onCopy(block.sessions);
      }}
    >
      <Field
        label="Client"
        value={program.callId}
        onChange={value => {
          setCallId(value);
          setVersionNumber(null);
          setBlockId(null);
        }}
        options={programs.map(other => ({ value: other.callId, label: clientName(other, journeys) }))}
      />
      <Field
        label="Version"
        value={String(version.number)}
        onChange={value => {
          setVersionNumber(Number(value));
          setBlockId(null);
        }}
        options={versions.map(other => ({ value: String(other.number), label: `Version ${other.number} · ${other.state}` }))}
      />
      <Field
        label="Block"
        value={block.id}
        onChange={setBlockId}
        options={blocks.map((other, index) => ({ value: other.id, label: `${index + 1}. ${BLOCK_TYPE_LABELS[other.type]} · ${other.weeks} weeks` }))}
      />
      <SheetDialogActions>
        <Button type="submit">Copy sessions</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </SheetDialogActions>
    </form>
  );
}

export function CopyBlockDialog({ open, onOpenChange, programs, journeys, onCopy }: CopyBlockDialogProps) {
  const sources = programs.filter(program => versionsWithBlocks(program).length > 0);
  return (
    <ResponsiveSheetDialog open={open} onOpenChange={onOpenChange} title="Copy from another client" width="fit">
      <SheetDialogHeader title="Copy from another client" description="The sessions of the chosen block replace this block's sessions." />
      <SheetDialogBody>
        {sources.length === 0 ? (
          <EmptyState icon={Users} title="No other client has a program yet." description="Once another client has a program, you can copy a block from it." />
        ) : (
          open && <CopyBlockForm programs={sources} journeys={journeys} onCopy={onCopy} onCancel={() => onOpenChange(false)} />
        )}
      </SheetDialogBody>
    </ResponsiveSheetDialog>
  );
}
