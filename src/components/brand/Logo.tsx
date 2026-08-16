import { cn } from "@/lib/utils";
import markAsset from "@/assets/lumapath-mark.png.asset.json";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-glow",
        className,
      )}
    >
      <img
        src={markAsset.url}
        alt="LumaPath AI logo"
        className="h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      {!compact && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          Luma<span className="text-primary">Path</span>{" "}
          <span className="text-muted-foreground font-medium">AI</span>
        </span>
      )}
    </span>
  );
}