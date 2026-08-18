import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ClipboardList, Clock, ListChecks, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChildGate } from "@/components/common/ChildGate";
import { AGE_BANDS } from "@/constants";
import { useActiveChild } from "@/hooks/useActiveChild";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/assessments")({
  head: () => ({
    meta: [
      { title: "Choose an assessment — LumaPath AI" },
      { name: "description", content: "Pick the age-matched communication screening set for your child." },
      { property: "og:title", content: "Choose an assessment — LumaPath AI" },
      { property: "og:description", content: "Age-matched communication screening sets from 0 to 6 years." },
    ],
  }),
  component: AssessmentSelection,
});

function AssessmentSelection() {
  const navigate = useNavigate();
  const { child, loading } = useActiveChild();
  const startDraft = useAppStore((s) => s.startDraft);

  if (!child) {
    return (
      <AppShell title="Choose an assessment">
        <ChildGate loading={loading} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Choose an assessment"
      subtitle={`Recommended for ${child.name} based on date of birth. You can also run an adjacent set.`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGE_BANDS.map((band, i) => {
          const recommended = band.id === child.ageBandId;
          return (
            <motion.div
              key={band.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card
                className={`h-full gap-0 rounded-2xl p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift ${
                  recommended ? "border-primary/40 bg-gradient-surface ring-1 ring-primary/20" : "border-border/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">{band.label}</h2>
                  {recommended && (
                    <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                      <Sparkles className="mr-1 h-3 w-3" /> Recommended
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{band.description}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {band.focusAreas.map((f) => (
                    <Badge key={f} variant="secondary" className="rounded-full text-[11px] font-medium">
                      {f}
                    </Badge>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> ~{band.durationMinutes} min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" /> {band.activityCount} activities
                  </span>
                </div>

                <Button
                  className="mt-6 w-full rounded-xl"
                  variant={recommended ? "default" : "outline"}
                  onClick={() => {
                    startDraft(band.id);
                    navigate({ to: "/assessment/$bandId/live", params: { bandId: band.id } });
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Start live AI session
                </Button>
                <Button
                  variant="outline"
                  className="mt-2 w-full rounded-xl"
                  onClick={() => {
                    startDraft(band.id);
                    navigate({ to: "/assessment/$bandId/manual", params: { bandId: band.id } });
                  }}
                >
                  <ClipboardList className="h-4 w-4" /> Manual questionnaire (no camera)
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 w-full rounded-xl text-xs"
                  onClick={() => {
                    startDraft(band.id);
                    navigate({ to: "/assessment/$bandId/guide", params: { bandId: band.id } });
                  }}
                >
                  Preview activities first
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}