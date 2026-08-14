import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, HeartPulse, MessageCircle, Pencil, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGE_BANDS } from "@/constants";
import { DEMO_CHILD } from "@/services/mockData";
import { useAppStore } from "@/store/useAppStore";
import { formatAge, formatDate } from "@/utils/age";
import type { HistoryEntry } from "@/types";

export const Route = createFileRoute("/child")({
  head: () => ({
    meta: [
      { title: "Child profile — LumaPath AI" },
      { name: "description", content: "Medical notes, development history and communication milestones." },
      { property: "og:title", content: "Child profile — LumaPath AI" },
      { property: "og:description", content: "Medical notes, development history and communication milestones." },
    ],
  }),
  component: ChildProfilePage,
});

function ChildProfilePage() {
  const child = useAppStore((s) => s.child) ?? DEMO_CHILD;
  const band = AGE_BANDS.find((b) => b.id === child.ageBandId)!;
  const initials = child.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <AppShell title="Child profile" subtitle="Everything the AI and your clinician use for context.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="gap-0 rounded-2xl border-border/70 p-6 text-center shadow-soft">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-aurora text-2xl font-semibold text-white shadow-glow">
            {initials}
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">{child.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatAge(child.birthDate)} · {child.gender === "other" ? "Not specified" : child.gender}
          </p>
          <Badge variant="secondary" className="mx-auto mt-3 rounded-full">
            {band.label} band
          </Badge>
          <p className="mt-4 text-xs text-muted-foreground">Born {formatDate(child.birthDate)}</p>
          <Button asChild variant="outline" className="mt-6 rounded-xl">
            <Link to="/onboarding/child">
              <Pencil className="h-4 w-4" /> Edit profile
            </Link>
          </Button>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-2xl border-border/70 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Medical notes</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {child.medicalNotes || "No medical notes recorded yet."}
            </p>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <TimelineCard
              icon={<Sparkles className="h-4 w-4 text-accent" />}
              title="Development history"
              entries={child.developmentHistory}
            />
            <TimelineCard
              icon={<MessageCircle className="h-4 w-4 text-primary" />}
              title="Communication history"
              entries={child.communicationHistory}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TimelineCard({
  icon,
  title,
  entries,
}: {
  icon: React.ReactNode;
  title: string;
  entries: HistoryEntry[];
}) {
  return (
    <Card className="rounded-2xl border-border/70 p-6 shadow-soft">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <ol className="mt-5 space-y-5 border-l border-border pl-5">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
            <p className="text-sm font-medium">{e.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> {formatDate(e.date)}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}