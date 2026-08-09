import type { ReactNode } from "react";

import { LegalNav } from "../legal/legal-nav";

type PublicFooterProps = {
  children?: ReactNode;
};

export function PublicFooter(props: PublicFooterProps) {
  return (
    <footer className="bg-surface-page text-text-secondary">
      {props.children ?? <LegalNav className="mx-auto max-w-stage px-6 py-8 lg:px-12" />}
    </footer>
  );
}
