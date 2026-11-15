import type { ReactNode } from "react";

type SkipLinkProps = {
  targetId: string;
  children?: ReactNode;
};

export function SkipLink({
  targetId,
  children = "Skip to main content",
}: SkipLinkProps) {
  return (
    <a className="ui-skip-link" href={`#${targetId}`}>
      {children}
    </a>
  );
}
