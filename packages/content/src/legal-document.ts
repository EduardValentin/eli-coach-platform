export type LegalLink = {
  href: string;
  label: string;
  scope: "external" | "internal";
};

export type LegalText = readonly (string | LegalLink)[];

export type LegalDocumentBlock =
  | {
      kind: "paragraph";
      content: LegalText;
    }
  | {
      kind: "list";
      items: readonly LegalText[];
    }
  | {
      kind: "definition-list";
      items: readonly {
        term: string;
        description: LegalText;
      }[];
    };

export type LegalDocumentSection = {
  id: string;
  heading: string;
  blocks: readonly LegalDocumentBlock[];
};

export type LegalDocument = {
  id: string;
  version: string;
  effectiveDate: string;
  title: string;
  description: string;
  sections: readonly LegalDocumentSection[];
};
