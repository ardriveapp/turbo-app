import { FC, ReactNode } from 'react';

interface FormEntryProps {
  name: string;
  label: string;
  children: ReactNode;
  errorText?: string;
}

const FormEntry: FC<FormEntryProps> = ({ name, label, children, errorText }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-foreground/80" htmlFor={name}>
        {label}
      </label>
      <div className="w-full rounded border border-border/20">{children}</div>
      {errorText && <div className="text-xs text-error">{errorText}</div>}
    </div>
  );
};

export default FormEntry;