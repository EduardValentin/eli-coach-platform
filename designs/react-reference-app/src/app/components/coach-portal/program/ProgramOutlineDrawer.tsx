import { X } from 'lucide-react';
import type { CycleMode, ProgramContent } from '../../../domain/program';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import type { EditorSection } from './editorSection';
import { EditorRail } from './EditorRail';
import type { useRailDrawer } from './useRailDrawer';

type ProgramOutlineDrawerProps = {
  rail: ReturnType<typeof useRailDrawer>;
  content: ProgramContent;
  cycleMode: CycleMode;
  dayOne: Date | null;
  today: Date;
  selected: EditorSection;
  onSelect: (section: EditorSection) => void;
  onAddBlock: () => void;
};

export function ProgramOutlineDrawer({ rail, content, cycleMode, dayOne, today, selected, onSelect, onAddBlock }: ProgramOutlineDrawerProps) {
  return (
    <>
      {rail.open && <div aria-hidden="true" className="fixed inset-0 z-40 bg-overlay-medium lg:hidden" data-parity="drawer-backdrop" onClick={rail.hide} />}
      <aside
        ref={rail.aside}
        aria-label="Program outline"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-80 shrink-0 flex-col overflow-y-auto border-r border-border bg-card duration-300 ease-out motion-reduce:transition-none lg:visible lg:relative lg:z-auto lg:w-72 lg:translate-x-0',
          {
            'translate-x-0 shadow-drawer transition-[translate]': rail.open,
            'invisible -translate-x-full transition-[translate,visibility]': !rail.open,
          },
        )}
      >
        <div className="flex justify-end p-2 lg:hidden">
          <Button ref={rail.closeButton} onClick={rail.hide} variant="ghost" size="icon-sm" aria-label="Close program sections">
            <X size={18} />
          </Button>
        </div>
        <EditorRail content={content} cycleMode={cycleMode} dayOne={dayOne} today={today} selected={selected} onSelect={onSelect} onAddBlock={onAddBlock} />
      </aside>
    </>
  );
}
