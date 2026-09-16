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
  effectiveDateLabel: string;
  title: string;
  description: string;
  sections: readonly LegalDocumentSection[];
};

const effectiveDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatEffectiveDate(isoDate: string): string {
  return effectiveDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}
