import {
  ResponsiveSheetDialog,
  SheetDialogActions,
  SheetDialogBody,
  SheetDialogHeader,
} from "~/shared/design-system/layout";
import { Button, Input, Label } from "~/shared/design-system/primitives";
import { useId, useState, type RefObject } from "react";

import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  BlockWeeks,
  ProgramSuggestions,
  type Block,
  type BlockType,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { OptionSelect, type Option } from "./option-select";

type AddBlockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastBlock: Block | undefined;
  returnFocusTo: RefObject<HTMLElement | null>;
  onAdd: (type: BlockType, weeks: number) => void;
};

type AddBlockFormProps = {
  lastBlock: Block | undefined;
  onAdd: AddBlockDialogProps["onAdd"];
  onCancel: () => void;
};

const TYPE_OPTIONS: Option<BlockType>[] = BLOCK_TYPES.map((type) => ({
  value: type,
  label: BLOCK_TYPE_LABELS[type],
}));

const STARTING_WEEKS = ProgramSuggestions.proposedBlockAfter(undefined).weeks;

function AddBlockForm({ lastBlock, onAdd, onCancel }: AddBlockFormProps) {
  const [type, setType] = useState<BlockType>(
    () => ProgramSuggestions.proposedBlockAfter(lastBlock).type,
  );
  const [weeks, setWeeks] = useState(String(STARTING_WEEKS));
  const typeId = useId();
  const weeksId = useId();
  const weeksHintId = useId();
  const isDeload = type === "deload";
  const chosenWeeks = BlockWeeks.forType(type, Number(weeks));
  const valid = BlockWeeks.isAllowed(type, chosenWeeks);

  return (
    <form
      className="grid gap-5"
      data-parity-root="AddBlockDialog"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onAdd(type, chosenWeeks);
      }}
    >
      <div className="grid gap-2" data-parity="add-block-type-field">
        <Label htmlFor={typeId}>Type</Label>
        <OptionSelect
          id={typeId}
          onChange={setType}
          options={TYPE_OPTIONS}
          value={type}
        />
      </div>
      <div className="grid gap-2" data-parity="add-block-weeks-field">
        <Label htmlFor={weeksId}>Weeks</Label>
        <Input
          aria-describedby={isDeload ? weeksHintId : undefined}
          className="w-24"
          disabled={isDeload}
          id={weeksId}
          min={1}
          onChange={(event) => setWeeks(event.target.value)}
          type="number"
          value={isDeload ? String(chosenWeeks) : weeks}
        />
        {isDeload && (
          <p className="text-sm text-text-secondary" id={weeksHintId}>
            A Deload lasts one week
          </p>
        )}
      </div>
      <SheetDialogActions>
        <Button disabled={!valid} size="sm" type="submit">
          Add block
        </Button>
        <Button onClick={onCancel} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
      </SheetDialogActions>
    </form>
  );
}

export function AddBlockDialog({
  open,
  onOpenChange,
  lastBlock,
  returnFocusTo,
  onAdd,
}: AddBlockDialogProps) {
  return (
    <ResponsiveSheetDialog
      onOpenChange={onOpenChange}
      open={open}
      returnFocusTo={returnFocusTo}
      title="Add a block"
      width="fit"
    >
      <SheetDialogHeader title="Add a block" />
      <SheetDialogBody>
        {open && (
          <AddBlockForm
            lastBlock={lastBlock}
            onAdd={onAdd}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetDialogBody>
    </ResponsiveSheetDialog>
  );
}
