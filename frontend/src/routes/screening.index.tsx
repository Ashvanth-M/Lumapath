import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, CircleDot, Info, Video } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STANDARD_ACTIVITIES } from "@/constants/screening";

export const Route = createFileRoute("/screening/")({
  head: () => ({
    meta: [
      { title: "New behaviour screening — LumaPath AI" },
      {
        name: "description",
        content:
          "Choose one of five standardized parent–child interaction activities, record it, and upload the video for AI behavioural analysis.",
      },
      { property: "og:title", content: "New behaviour screening — LumaPath AI" },
      { property: "og:description", content: "Five standardized parent–child interaction activities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScreeningPage,
});

function ScreeningPage() {
  return (
    <AppShell
      title="New behaviour screening"
      subtitle="Pick one standardized activity, record it at home, then upload the video for analysis."
    >
      <Card className="mb-6 flex-row items-start gap-3 rounded-2xl border-primary/20 bg-primary/5 p-5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each activity is a short, standardized interaction. Record it exactly as described so the
          behavioural measurements stay comparable between sessions.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {STANDARD_ACTIVITIES.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="h-full gap-0 rounded-3xl border-border/70 p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Activity {i + 1}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight">{a.title}</h2>
                </div>
                <Badge variant="secondary" className="shrink-0 rounded-full">
                  ~{a.recommendedSeconds}s
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.purpose}</p>

              <ul className="mt-4 space-y-2">
                {a.setup.map((s) => (
                  <li key={s} className="flex gap-2.5 text-sm text-muted-foreground">
                    <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span className="min-w-0">{s}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {a.observes.map((o) => (
                  <Badge key={o} variant="outline" className="rounded-full text-[11px] font-medium">
                    {o}
                  </Badge>
                ))}
              </div>

              <Button asChild className="mt-5 w-full rounded-xl">
                <Link to="/screening/$activityId/upload" params={{ activityId: a.id }}>
                  <Video className="h-4 w-4" /> Upload video for this activity
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
