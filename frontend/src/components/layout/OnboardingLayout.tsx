import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/card";

export function OnboardingLayout({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Logo className="mb-8" />
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-gradient-primary" : "bg-secondary"}`}
            />
          ))}
          <span className="ml-2 text-xs font-medium text-muted-foreground">Step {step} of 2</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <Card className="mt-6 rounded-2xl border-border/70 p-6 shadow-soft">{children}</Card>
        </motion.div>
      </div>
    </div>
  );
}