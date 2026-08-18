import { createFileRoute } from "@tanstack/react-router";
import { Info, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community benchmarks — LumaPath AI" },
      {
        name: "description",
        content:
          "Anonymised peer comparison by age band. Not yet available — it requires aggregated data across families.",
      },
      { property: "og:title", content: "Community benchmarks — LumaPath AI" },
      { property: "og:description", content: "Anonymised peer benchmarks by age band." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <AppShell
      title="Community benchmarks"
      subtitle="Anonymised comparison with other families screening in the same age band."
    >
      <EmptyState
        icon={Users}
        title="Not available yet"
        description="Peer benchmarks need anonymised results aggregated across many families in the same age band. There isn't enough data to produce an honest comparison, so nothing is shown here rather than a placeholder figure."
        actionLabel="Back to your progress"
        actionTo="/progress"
      />

      <Card className="mt-6 flex-row items-start gap-3 rounded-2xl border-border/70 p-5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">What this page will show</p>
          <p className="mt-1.5">
            Once enough screenings exist, this will compare each domain score against the
            distribution for the same age band — with an explicit sample size, so you can judge how
            much weight it deserves.
          </p>
          <p className="mt-3">
            Percentiles describe variation between families, not clinical norms. A low percentile is
            not a diagnosis, and a high one does not rule out a concern worth raising with a
            clinician.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
