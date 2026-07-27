import type { ReactNode } from "react";

import { Link } from "@eli-coach-platform/ui";

type PublicFooterProps = {
  children?: ReactNode;
};

export function PublicFooter(props: PublicFooterProps) {
  return (
    <footer className="bg-surface-page text-text-secondary">
      {props.children}
      <nav
        aria-label="Legal"
        className="mx-auto flex max-w-stage flex-wrap justify-center gap-x-6 gap-y-3 px-6 py-8 text-body-sm lg:px-12"
      >
        <Link reloadDocument to="/privacy" variant="subtle">
          Privacy Policy
        </Link>
        <Link reloadDocument to="/terms" variant="subtle">
          Terms & Conditions
        </Link>
      </nav>
    </footer>
  );
}
