import type { ReactNode } from "react";

type SkipLinkProps = {
  targetId: string;
  children?: ReactNode;
};

function SkipLink({ targetId, children = "Skip to main content" }: SkipLinkProps) {
  return (
    <a data-slot="skip-link" className="ui-skip-link" href={`#${targetId}`}>
      {children}
    </a>
  );
}

export { SkipLink };
