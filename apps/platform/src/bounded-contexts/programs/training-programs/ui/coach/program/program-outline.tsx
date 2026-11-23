import { SheetContent, SheetTitle } from "~/shared/design-system/overlays";
import type { ComponentProps } from "react";

import { EditorRail } from "./editor-rail";

const OUTLINE_NAME = "Program outline";

export function ProgramOutline(props: ComponentProps<typeof EditorRail>) {
  return (
    <>
      <aside
        aria-label={OUTLINE_NAME}
        className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-border-default bg-surface-base lg:flex"
      >
        <EditorRail {...props} />
      </aside>
      <SheetContent aria-describedby={undefined} side="left">
        <SheetTitle className="sr-only">{OUTLINE_NAME}</SheetTitle>
        <EditorRail {...props} />
      </SheetContent>
    </>
  );
}
