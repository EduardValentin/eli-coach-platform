import type { ComponentProps } from 'react';

export function EditorShell(props: ComponentProps<'div'>) {
  return <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle" {...props} />;
}
