import { forwardRef } from "react";
import { cn } from "@/lib/core/cn";

/** Checkbox (DESIGN.md §Checkboxes) — 20px, radius 4px, coché vert sève. */
export const Checkbox = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-5 w-5 cursor-pointer rounded-[4px] border-line-strong accent-[#1E6B4A] transition-colors focus:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";

/** Radio (DESIGN.md §Radio Buttons) — 20px, sélection vert sève. */
export const Radio = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="radio"
      className={cn(
        "h-5 w-5 cursor-pointer border-line-strong accent-[#1E6B4A] focus:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Radio.displayName = "Radio";

/** Interrupteur on/off pour les réglages. */
export function Switch({ checked, className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative inline-flex cursor-pointer items-center", className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} {...props} />
      <div className="h-6 w-11 rounded-pill bg-line-strong transition-colors peer-checked:bg-primary peer-focus-visible:shadow-focus" />
      <div className="absolute left-1 top-1 h-4 w-4 rounded-circle bg-white transition-transform peer-checked:translate-x-5" />
    </label>
  );
}
