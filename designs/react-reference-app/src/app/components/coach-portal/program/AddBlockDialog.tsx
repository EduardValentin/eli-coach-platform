import { useId, useState } from 'react';
import { BLOCK_TYPE_LABELS, BLOCK_TYPES, type Block, type BlockType } from '../../../domain/program';
import { ResponsiveSheetDialog, SheetDialogActions, SheetDialogBody, SheetDialogHeader } from '../../ResponsiveSheetDialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const DEFAULT_WEEKS = 4;
const DELOAD_AFTER_WEEKS = 4;

type AddBlockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastBlock: Block | undefined;
  onAdd: (type: BlockType, weeks: number) => void;
};

function defaultType(lastBlock: Block | undefined): BlockType {
  const loading = lastBlock?.type === 'strength' || lastBlock?.type === 'hypertrophy';
  return loading && lastBlock.weeks >= DELOAD_AFTER_WEEKS ? 'deload' : 'hypertrophy';
}

function AddBlockForm({ lastBlock, onAdd, onCancel }: { lastBlock: Block | undefined; onAdd: AddBlockDialogProps['onAdd']; onCancel: () => void }) {
  const [type, setType] = useState<BlockType>(() => defaultType(lastBlock));
  const [weeks, setWeeks] = useState(String(DEFAULT_WEEKS));
  const typeId = useId();
  const weeksId = useId();
  const isDeload = type === 'deload';
  const chosenWeeks = isDeload ? 1 : Number(weeks);
  const valid = Number.isInteger(chosenWeeks) && chosenWeeks >= 1;

  return (
    <form
      className="grid gap-5"
      onSubmit={event => {
        event.preventDefault();
        if (valid) onAdd(type, chosenWeeks);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={typeId}>Type</Label>
        <Select value={type} onValueChange={value => setType(value as BlockType)}>
          <SelectTrigger id={typeId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map(option => (
              <SelectItem key={option} value={option}>
                {BLOCK_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={weeksId}>Weeks</Label>
        <Input
          id={weeksId}
          type="number"
          min={1}
          className="w-24"
          value={isDeload ? '1' : weeks}
          disabled={isDeload}
          onChange={event => setWeeks(event.target.value)}
        />
      </div>
      <SheetDialogActions>
        <Button type="submit" disabled={!valid}>
          Add block
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </SheetDialogActions>
    </form>
  );
}

export function AddBlockDialog({ open, onOpenChange, lastBlock, onAdd }: AddBlockDialogProps) {
  return (
    <ResponsiveSheetDialog open={open} onOpenChange={onOpenChange} title="Add a block" width="fit">
      <SheetDialogHeader title="Add a block" />
      <SheetDialogBody>
        {open && <AddBlockForm lastBlock={lastBlock} onAdd={onAdd} onCancel={() => onOpenChange(false)} />}
      </SheetDialogBody>
    </ResponsiveSheetDialog>
  );
}
