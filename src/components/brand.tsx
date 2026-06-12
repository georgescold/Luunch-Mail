import { cn } from "@/lib/core/cn";
import { Send } from "lucide-react";

/** Logo Luunch Mail (icône + wordmark Fredoka). */
export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" };
  const text = { sm: "text-h4", md: "text-h3", lg: "text-h2" };
  const icon = { sm: 16, md: 20, lg: 24 };
  return (
    <span className={cn("inline-flex items-center gap-sp-2", className)}>
      <span className={cn("flex items-center justify-center rounded-md bg-primary text-white shadow-sm", dims[size])}>
        <Send size={icon[size]} />
      </span>
      <span className={cn("font-headline font-bold tracking-tight text-ink", text[size])}>Luunch Mail</span>
    </span>
  );
}
