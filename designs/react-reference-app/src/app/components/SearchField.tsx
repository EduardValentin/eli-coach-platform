import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from './ui/utils';

type SearchFieldProps = React.ComponentProps<'input'> & {
  className?: string;
};

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, ...inputProps }, ref) => (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={ref}
        type="search"
        className="h-(--size-control-xs) pl-9 md:text-sm"
        {...inputProps}
      />
    </div>
  ),
);

SearchField.displayName = 'SearchField';
