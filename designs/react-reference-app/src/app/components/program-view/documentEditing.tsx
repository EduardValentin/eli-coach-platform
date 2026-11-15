import { createContext, useContext, type ReactNode } from 'react';
import type { ProgramTextTarget } from '../../domain/programTexts';

export type DocumentEditing = {
  write: (target: ProgramTextTarget, text: string) => void;
  reset: (target: ProgramTextTarget) => void;
};

export type DocumentTypography = { body: string; heading: string };

export type HeadingLevel = 1 | 2 | 3 | 4;

type DocumentEditingValue = { editing: DocumentEditing | null; typography: DocumentTypography; topLevel: HeadingLevel };

const NO_TYPOGRAPHY: DocumentTypography = { body: '', heading: '' };

const DocumentEditingContext = createContext<DocumentEditingValue>({ editing: null, typography: NO_TYPOGRAPHY, topLevel: 1 });

type DocumentEditingProviderProps = {
  editing: DocumentEditing | null;
  typography?: DocumentTypography;
  topLevel?: HeadingLevel;
  children: ReactNode;
};

export function DocumentEditingProvider({ editing, typography = NO_TYPOGRAPHY, topLevel = 1, children }: DocumentEditingProviderProps) {
  return <DocumentEditingContext.Provider value={{ editing, typography, topLevel }}>{children}</DocumentEditingContext.Provider>;
}

export function useDocumentEditing(): DocumentEditing | null {
  return useContext(DocumentEditingContext).editing;
}

export function useDocumentTypography(): DocumentTypography {
  return useContext(DocumentEditingContext).typography;
}

type DocumentHeadingProps = { level: HeadingLevel; id?: string; className?: string; children: ReactNode };

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;

export function DocumentHeading({ level, id, className, children }: DocumentHeadingProps) {
  const { topLevel } = useContext(DocumentEditingContext);
  const Tag = HEADING_TAGS[level + topLevel - 2];
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}
