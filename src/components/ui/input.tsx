import { forwardRef } from "react";
import { cn } from "@/lib/core/cn";

const base =
  "w-full rounded-sm border bg-surface px-sp-4 py-sp-3 text-body text-ink placeholder:text-ink-disabled transition-colors focus:outline-none disabled:bg-fill-subtle disabled:border-line disabled:cursor-not-allowed";
const states =
  "border-line-strong hover:border-line-hover focus:border-primary focus:shadow-focus";
const errorStates = "border-error bg-error-soft focus:shadow-focus-error";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input ref={ref} className={cn(base, invalid ? errorStates : states, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, "min-h-[120px] resize-y leading-relaxed", invalid ? errorStates : states, className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(base, states, "cursor-pointer appearance-none bg-[length:16px] pr-sp-8", className)} {...props} />
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-sp-2 block text-sm font-medium text-ink-muted", className)} {...props} />;
}

export function Field({ label, hint, error, htmlFor, children, className }: {
  label?: string; hint?: string; error?: string; htmlFor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-sp-4", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="mt-sp-1 text-xs text-error">{error}</p>
      ) : hint ? (
        <p className="mt-sp-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}
