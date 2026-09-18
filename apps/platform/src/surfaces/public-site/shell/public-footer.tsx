import type { ReactNode } from "react";

import { LegalNav } from "~/surfaces/public-site/sections/legal/legal-nav";

type PublicFooterProps = {
  children?: ReactNode;
};

export function PublicFooter(props: PublicFooterProps) {
  return (
    <footer className="bg-surface-page text-copy-muted">
      {props.children ?? (
        <LegalNav className="mx-auto max-w-stage px-6 py-8 lg:px-12" />
      )}
    </footer>
  );
}
