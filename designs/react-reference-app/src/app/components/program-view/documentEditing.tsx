import { createContext, useContext, type ReactNode } from 'react';
import type { ProgramTextTarget } from '../../domain/programTexts';

export type DocumentEditing = {
  write: (target: ProgramTextTarget, text: string) => void;
  reset: (target: ProgramTextTarget) => void;
};

export type DocumentTypography = { body: string; heading: string };

type DocumentEditingValue = { editing: DocumentEditing | null; typography: DocumentTypography };

const NO_TYPOGRAPHY: DocumentTypography = { body: '', heading: '' };

const DocumentEditingContext = createContext<DocumentEditingValue>({ editing: null, typography: NO_TYPOGRAPHY });

type DocumentEditingProviderProps = { editing: DocumentEditing | null; typography?: DocumentTypography; children: ReactNode };

export function DocumentEditingProvider({ editing, typography = NO_TYPOGRAPHY, children }: DocumentEditingProviderProps) {
  return <DocumentEditingContext.Provider value={{ editing, typography }}>{children}</DocumentEditingContext.Provider>;
}

export function useDocumentEditing(): DocumentEditing | null {
  return useContext(DocumentEditingContext).editing;
}

export function useDocumentTypography(): DocumentTypography {
  return useContext(DocumentEditingContext).typography;
}

type HeadingLevel = 1 | 2 | 3 | 4;
type DocumentHeadingProps = { level: HeadingLevel; className?: string; children: ReactNode };

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;

export function DocumentHeading({ level, className, children }: DocumentHeadingProps) {
  const nested = useDocumentEditing() !== null;
  const Tag = HEADING_TAGS[nested ? level : level - 1];
  return <Tag className={className}>{children}</Tag>;
}
