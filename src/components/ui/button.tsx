import { forwardRef } from "react";
import { cn } from "@/lib/core/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-surface text-primary border border-primary hover:bg-primary-soft",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  destructive: "bg-error text-white hover:bg-error-hover",
  subtle: "bg-fill-muted text-ink-muted hover:bg-line border border-transparent",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-sp-3 py-[6px] text-sm gap-sp-1",
  md: "px-sp-5 py-[10px] text-body gap-sp-2",
  lg: "px-[28px] py-[14px] text-h4 gap-sp-2",
};

/** Classe utilitaire (pour appliquer le style bouton à un <Link>). */
export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  const { variant = "primary", size = "md", className } = opts;
  return cn(
    "inline-flex items-center justify-center rounded-md font-body font-medium transition-[background-color,border-color,box-shadow,transform] duration-150 focus:outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97] disabled:active:scale-100",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => (
    <button ref={ref} className={buttonClasses({ variant, size, className })} {...props} />
  ),
);
Button.displayName = "Button";
