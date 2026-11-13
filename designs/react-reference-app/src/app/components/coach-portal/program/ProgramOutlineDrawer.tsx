import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { EditorRail } from './EditorRail';
import type { useRailDrawer } from './useRailDrawer';

type ProgramOutlineDrawerProps = ComponentProps<typeof EditorRail> & { rail: ReturnType<typeof useRailDrawer> };

export function ProgramOutlineDrawer({ rail, ...railProps }: ProgramOutlineDrawerProps) {
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
        <EditorRail {...railProps} />
      </aside>
    </>
  );
}
