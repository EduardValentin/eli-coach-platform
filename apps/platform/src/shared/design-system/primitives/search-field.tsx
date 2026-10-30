import { Search } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";
import { Input } from "./input";

type SearchFieldProps = Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  "type"
>;

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, ...inputProps }, ref) => (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
      />
      <Input className="pl-9" ref={ref} type="search" {...inputProps} />
    </div>
  ),
);

SearchField.displayName = "SearchField";
