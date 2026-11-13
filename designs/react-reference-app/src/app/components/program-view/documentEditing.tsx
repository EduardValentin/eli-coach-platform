import { createContext, useContext, type ReactNode } from 'react';
import type { ProgramTextTarget } from '../../domain/programTexts';

export type DocumentEditing = {
  write: (target: ProgramTextTarget, text: string) => void;
  reset: (target: ProgramTextTarget) => void;
};

const DocumentEditingContext = createContext<DocumentEditing | null>(null);

export function DocumentEditingProvider({ editing, children }: { editing: DocumentEditing | null; children: ReactNode }) {
  return <DocumentEditingContext.Provider value={editing}>{children}</DocumentEditingContext.Provider>;
}

export function useDocumentEditing(): DocumentEditing | null {
  return useContext(DocumentEditingContext);
}

type HeadingLevel = 1 | 2 | 3 | 4;
type DocumentHeadingProps = { level: HeadingLevel; className?: string; children: ReactNode };

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;

export function DocumentHeading({ level, className, children }: DocumentHeadingProps) {
  const nested = useDocumentEditing() !== null;
  const Tag = HEADING_TAGS[nested ? level : level - 1];
  return <Tag className={className}>{children}</Tag>;
}
