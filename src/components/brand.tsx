import { cn } from "@/lib/core/cn";

/** Pictogramme Luunch : croissant de lune doré sur disque sapin. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#142019" />
      {/* croissant : disque or recouvert d'un disque sapin décalé */}
      <circle cx="18.5" cy="14" r="8.5" fill="#E8B64C" />
      <circle cx="15" cy="11.5" r="8.5" fill="#142019" />
      {/* étoile discrète */}
      <circle cx="10.5" cy="21.5" r="1.3" fill="#E4EFE6" />
    </svg>
  );
}

/** Logo Luunch Mail (croissant + wordmark Bricolage). */
export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" };
  const text = { sm: "text-h4", md: "text-h3", lg: "text-h2" };
  return (
    <span className={cn("inline-flex items-center gap-sp-2", className)}>
      <LogoMark className={dims[size]} />
      <span className={cn("font-headline font-bold tracking-tight text-ink", text[size])}>Luunch Mail</span>
    </span>
  );
}
