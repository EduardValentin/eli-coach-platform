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
        inline:
          'underline decoration-divider decoration-1 underline-offset-2 hover:decoration-current print:no-underline',
      },
      reach: {
        line: '',
        touch: 'inline-flex min-h-12 items-center print:min-h-0',
      },
    },
    compoundVariants: [
      { variant: 'inline', reach: 'line', class: 'py-1 -my-1' },
    ],
    defaultVariants: {
      variant: 'in-text',
      reach: 'line',
    },
  },
);

type LinkVariantProps = VariantProps<typeof linkClasses>;

export type LinkReach = NonNullable<LinkVariantProps['reach']>;

function linkVariants(options?: LinkVariantProps): string {
  return cn(linkClasses(options));
}

type LinkProps = RouterLinkProps & LinkVariantProps;

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, reach, ...props }, ref) => (
    <RouterLink ref={ref} className={cn(linkClasses({ variant, reach }), className)} {...props} />
  ),
);

Link.displayName = 'Link';

export { Link, linkVariants };
