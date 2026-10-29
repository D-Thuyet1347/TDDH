import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200/70',
        secondary: 'border-transparent bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/70',
        destructive: 'border-transparent bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70',
        outline: 'border-slate-200 bg-white text-slate-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
