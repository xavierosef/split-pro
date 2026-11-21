import * as React from 'react';

import { cn } from '~/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  rightIcon?: React.ReactNode;
};

const inputStyles =
  'border-input bg-primary-foreground bg-opacity-90 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-opacity-30 flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50';

// React 19 passes `ref` as a regular prop: the add-expense screen focuses the field through it.
const Input: React.FC<InputProps & { ref?: React.Ref<HTMLInputElement> }> = ({
  className,
  type,
  rightIcon,
  ref,
  ...props
}) => {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(inputStyles, className)}
        {...props}
      />
      {rightIcon && <span className="absolute top-1/2 right-3 -translate-y-1/2">{rightIcon}</span>}
    </div>
  );
};

Input.displayName = 'Input';

const MultilineInput: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  rows = 3,
  ...props
}) => (
  <textarea
    data-slot="input"
    rows={rows}
    className={cn(inputStyles, 'h-auto resize-none', className)}
    {...props}
  />
);

export { Input, MultilineInput };
