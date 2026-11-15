import type { ComponentProps } from 'react';
import { SheetContent, SheetTitle } from '../../ui/sheet';
import { useIsDesktop } from '../../ui/use-desktop';
import { EditorRail } from './EditorRail';

const OUTLINE_NAME = 'Program outline';

export function ProgramOutline(props: ComponentProps<typeof EditorRail>) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <aside aria-label={OUTLINE_NAME} className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-card">
        <EditorRail {...props} />
      </aside>
    );
  }

  return (
    <SheetContent side="left" aria-describedby={undefined}>
      <SheetTitle className="sr-only">{OUTLINE_NAME}</SheetTitle>
      <EditorRail {...props} />
    </SheetContent>
  );
}
