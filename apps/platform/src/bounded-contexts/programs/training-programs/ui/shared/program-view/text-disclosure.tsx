import { Slot } from "radix-ui";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

type GroupState = {
  isOpen: (value: string) => boolean;
  idOf: (value: string, part: "trigger" | "panel") => string;
  toggle: (value: string) => void;
};

const GroupContext = createContext<GroupState | null>(null);

function useGroup(): GroupState {
  const group = useContext(GroupContext);
  if (!group) {
    throw new Error("A disclosure needs a TextDisclosureGroup around it.");
  }

  return group;
}

/** Keeps one panel of the group open at a time. */
function toggled(
  open: ReadonlySet<string>,
  value: string,
): ReadonlySet<string> {
  return open.has(value) ? new Set() : new Set([value]);
}

export function TextDisclosureGroup({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const baseId = useId();

  const group: GroupState = {
    isOpen: (value) => open.has(value),
    idOf: (value, part) => `${baseId}-${value}-${part}`,
    toggle: (value) => setOpen((current) => toggled(current, value)),
  };

  return (
    <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
  );
}

type DisclosurePartProps = { value: string; children: ReactElement };

/** Gives the caller's button the trigger's id, state and toggle. */
export function DisclosureTrigger({ value, children }: DisclosurePartProps) {
  const group = useGroup();
  const open = group.isOpen(value);

  return (
    <Slot.Root
      id={group.idOf(value, "trigger")}
      aria-expanded={open}
      aria-controls={open ? group.idOf(value, "panel") : undefined}
      data-state={open ? "open" : "closed"}
      onClick={() => group.toggle(value)}
    >
      {children}
    </Slot.Root>
  );
}

/** The caller's element as the panel its trigger controls, rendered only while open. */
export function DisclosureContent({ value, children }: DisclosurePartProps) {
  const group = useGroup();
  if (!group.isOpen(value)) return null;

  return <Slot.Root id={group.idOf(value, "panel")}>{children}</Slot.Root>;
}
