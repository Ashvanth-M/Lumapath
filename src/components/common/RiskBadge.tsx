import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";

const MAP: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: "Low concern", className: "bg-success/12 text-success border-success/25" },
  monitor: { label: "Monitor", className: "bg-warning/15 text-warning-foreground border-warning/35" },
  elevated: { label: "Elevated concern", className: "bg-destructive/10 text-destructive border-destructive/25" },
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const cfg = MAP[level];
  return (
    <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-medium", cfg.className, className)}>
      {cfg.label}
    </Badge>
  );
}