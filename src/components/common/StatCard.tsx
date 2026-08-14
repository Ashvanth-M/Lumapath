import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "accent" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/12 text-accent",
    success: "bg-success/12 text-success",
    warning: "bg-warning/18 text-warning-foreground",
  } as const;

  return (
    <Card className={cn("gap-0 rounded-2xl border-border/70 bg-gradient-surface p-5 shadow-soft", className)}>
      <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}