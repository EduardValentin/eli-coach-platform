import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router';

import { cn } from './utils';

const linkClasses = cva(
  'outline-none transition-[background-color,border-color,color,box-shadow] duration-150 ease-out',
  {
    variants: {
      variant: {
        'in-text':
          'py-3.5 text-brand hover:underline',
      },
    },
    defaultVariants: {
      variant: 'in-text',
    },
  },
);

type LinkProps = RouterLinkProps & VariantProps<typeof linkClasses>;

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, ...props }, ref) => (
    <RouterLink ref={ref} className={cn(linkClasses({ variant }), className)} {...props} />
  ),
);

Link.displayName = 'Link';

export { Link };
