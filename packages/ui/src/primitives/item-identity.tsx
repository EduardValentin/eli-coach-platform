import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { DataAttributes } from "../lib/data-attributes";
import { ItemGlyph } from "./item-glyph";

type ItemIdentityProps = DataAttributes & {
  icon: LucideIcon;
  title: ReactNode;
  summary?: ReactNode;
  glyphAttributes?: DataAttributes;
  summaryAttributes?: DataAttributes;
};

export function ItemIdentity({
  icon,
  title,
  summary,
  glyphAttributes,
  summaryAttributes,
  ...dataAttributes
}: ItemIdentityProps) {
  return (
    <div {...dataAttributes} className="flex items-center gap-3">
      <ItemGlyph {...glyphAttributes} icon={icon} />
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {summary && (
          <p
            {...summaryAttributes}
            className="mt-0.5 text-xs text-text-secondary"
          >
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
