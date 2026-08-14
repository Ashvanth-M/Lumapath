import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  className?: string;
}

/**
 * Elegant empty state shown when a page has no data yet.
 * Used throughout the app for new users who haven't completed assessments.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  className = "",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 px-8 py-16 text-center ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionTo && (
        <Button asChild className="mt-6 rounded-xl" size="lg">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </motion.div>
  );
}
