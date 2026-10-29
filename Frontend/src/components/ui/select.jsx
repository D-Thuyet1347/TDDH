import React from 'react';
import { cn } from '../../lib/utils';

const Select = React.forwardRef(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs ring-offset-white transition-all focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
      className
    )}
    {...props}
  />
));
Select.displayName = 'Select';

export { Select };
