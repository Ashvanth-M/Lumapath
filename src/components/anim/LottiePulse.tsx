import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Vector pulse used for medical "live analysis" moments — a three-ring
 * expanding cadence rendered with Motion so it stays SSR-safe and light.
 */
export function LottiePulse({ className }: { className?: string }) {
  return (
    <span className={cn("pointer-events-none relative block", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: i === 1 ? "var(--accent)" : "var(--primary)" }}
          initial={{ scale: 0.35, opacity: 0.55 }}
          animate={{ scale: [0.35, 1], opacity: [0.55, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}