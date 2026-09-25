import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from './ui/utils';

type SearchFieldProps = Omit<React.ComponentProps<'input'>, 'size'> & {
  className?: string;
  size?: 'md' | 'sm';
};

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, size = 'md', ...inputProps }, ref) => (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={ref}
        type="search"
        size={size}
        className="pl-9"
        {...inputProps}
      />
    </div>
  ),
);

SearchField.displayName = 'SearchField';
