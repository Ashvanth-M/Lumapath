import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Globe2, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEMO_CHILD } from "@/services/mockData";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community benchmarks — LumaPath AI" },
      {
        name: "description",
        content: "See how your child's anonymised communication scores compare with peers in the same age band.",
      },
      { property: "og:title", content: "Community benchmarks — LumaPath AI" },
      { property: "og:description", content: "Anonymised peer benchmarks by age band." },
    ],
  }),
  component: CommunityPage,
});

const BENCH = [
  { label: "Eye contact", you: 82, peers: 74 },
  { label: "Speech & vocalisation", you: 68, peers: 71 },
  { label: "Gesture", you: 84, peers: 70 },
  { label: "Auditory response", you: 74, peers: 72 },
  { label: "Attention", you: 76, peers: 69 },
];

function CommunityPage() {
  const child = useAppStore((s) => s.child) ?? DEMO_CHILD;

  return (
    <AppShell
      title="Community benchmarks"
      subtitle="Anonymised, aggregated comparisons with families screening in the same age band."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Users, label: "Families in this band", value: "12,480" },
          { icon: Globe2, label: "Countries contributing", value: "34" },
          { icon: Users, label: `${child.name}'s percentile`, value: "68th" },
        ].map((s) => (
          <Card key={s.label} className="gap-0 rounded-2xl border-border/70 p-5 shadow-soft">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
        <h2 className="text-sm font-semibold tracking-tight">Domain comparison</h2>
        <ul className="mt-5 space-y-5">
          {BENCH.map((b, i) => (
            <li key={b.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{b.label}</span>
                <span className="text-xs text-muted-foreground">
                  You <strong className="text-foreground tabular-nums">{b.you}</strong> · peers{" "}
                  <span className="tabular-nums">{b.peers}</span>
                </span>
              </div>
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="space-y-1.5"
              >
                <Progress value={b.you} className="h-2" />
                <Progress value={b.peers} className="h-1 opacity-45" />
              </motion.div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">
          Benchmarks are aggregated and de-identified. They describe variation across families, not clinical norms.
        </p>
      </Card>
    </AppShell>
  );
}