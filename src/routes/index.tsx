import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  Eye,
  FileText,
  Hand,
  LineChart,
  MessageCircle,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Timer,
  UploadCloud,
  Users,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGE_BANDS } from "@/constants";
import {
  AI_MODEL_STACK,
  AI_MODULES,
  HOW_IT_WORKS,
  SCREENING_DISCLAIMER,
  STANDARD_ACTIVITIES,
  WHY_LUMAPATH,
} from "@/constants/screening";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LumaPath AI — AI-assisted behavioural screening for children 0–6" },
      {
        name: "description",
        content:
          "Upload a standardized parent–child interaction video and get objective AI behavioural measurements, a timestamped timeline and a clinician-ready report.",
      },
      { property: "og:title", content: "LumaPath AI — AI-assisted behavioural screening" },
      {
        property: "og:description",
        content: "Objective behavioural analysis of parent–child interaction videos for children 0–6.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PIPELINE = [
  { icon: UploadCloud, title: "Upload", body: "A short standardized interaction video, recorded at home." },
  { icon: ScanFace, title: "Detect", body: "Face, head pose and gaze tracked frame by frame." },
  { icon: Hand, title: "Measure", body: "Reaching, pointing and object interaction counted." },
  { icon: MessageCircle, title: "Listen", body: "Voice activity and vocalisation segments extracted." },
  { icon: Timer, title: "Time", body: "Response latency measured from prompt to reaction." },
  { icon: FileText, title: "Report", body: "Structured behavioural report for clinical review." },
];

const OUTCOMES = [
  { icon: Eye, title: "Behaviour timeline", body: "Every detected behaviour timestamped against your video, tap-to-jump." },
  { icon: Brain, title: "Communication Matrix", body: "Observations mapped onto the seven-level Communication Matrix." },
  { icon: LineChart, title: "Progress monitoring", body: "Each upload extends a longitudinal behavioural record." },
  { icon: Stethoscope, title: "Clinician workstation", body: "An AI-prioritised review queue with objective observations." },
];

function Landing() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const primaryTo = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
              <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
              <a href="#activities" className="transition-colors hover:text-foreground">Activities</a>
              <a href="#ai" className="transition-colors hover:text-foreground">AI modules</a>
              <a href="#why" className="transition-colors hover:text-foreground">Why LumaPath</a>
              <a href="#trust" className="transition-colors hover:text-foreground">Trust</a>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAuthenticated ? (
              <Button asChild className="rounded-full">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild className="rounded-full">
                  <Link to="/onboarding/parent">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-aurora px-4 py-20 sm:px-6 sm:py-28">
        <motion.div
          aria-hidden
          animate={{ y: [0, 22, 0], x: [0, 12, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: "easeInOut" }}
          className="pointer-events-none absolute -left-24 top-6 h-80 w-80 rounded-full bg-white/12"
        />
        <motion.div
          aria-hidden
          animate={{ y: [0, -18, 0], x: [0, -14, 0] }}
          transition={{ repeat: Infinity, duration: 19, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-white/10"
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center"
          >
            <LogoMark className="h-20 w-20 rounded-3xl bg-white/20" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-white/75"
          >
            AI-assisted behavioural analysis
          </motion.p>
          <motion.h1
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.14, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Objective behavioural insight from a five-minute home video.
          </motion.h1>
          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.24, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-white/85"
          >
            Record a standardized parent–child interaction, upload it, and LumaPath AI extracts
            measurable communication behaviours for your clinician to review.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.36 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="w-full rounded-full bg-white px-7 text-primary hover:bg-white/90 sm:w-auto">
              <Link to={primaryTo}>
                {isAuthenticated ? "Open dashboard" : "Start a screening"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="w-full rounded-full text-white hover:bg-white/15 hover:text-white sm:w-auto"
            >
              <a href="#how">See how the analysis works</a>
            </Button>
          </motion.div>
          <div className="mt-10 grid grid-cols-3 gap-4 text-white/85">
            {[
              { k: "5", v: "Standardized activities" },
              { k: "13", v: "Analysis stages" },
              { k: "0–6 yr", v: "Age coverage" },
            ].map((s) => (
              <div key={s.k}>
                <p className="text-xl font-semibold sm:text-2xl">{s.k}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/65 sm:text-xs">{s.v}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-9 max-w-md rounded-full bg-white/10 px-4 py-2 text-[11px] leading-relaxed text-white/80">
            {SCREENING_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
        <h2 className="mt-2 max-w-2xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Five steps from your living room to a clinical review
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="h-full gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
                <span className="font-mono text-sm font-semibold text-primary">{s.n}</span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 3) * 0.06, duration: 0.45 }}
            >
              <Card className="h-full gap-0 rounded-3xl border-border/70 bg-gradient-surface p-6 shadow-soft">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Standardized activities */}
      <section id="activities" className="scroll-mt-20 bg-secondary/40 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Standardized activities</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            The same five interactions, every session
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Standardizing what you record is what makes the measurements comparable over months —
            and comparable to what a clinician expects to see.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STANDARD_ACTIVITIES.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: (i % 3) * 0.06, duration: 0.45 }}
              >
                <Card className="h-full gap-0 rounded-3xl border-border/70 bg-card p-6 shadow-soft">
                  <span className="font-mono text-xs font-semibold text-primary">
                    0{i + 1} · ~{a.recommendedSeconds}s
                  </span>
                  <h3 className="mt-3 text-base font-semibold tracking-tight">{a.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.purpose}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {a.observes.map((o) => (
                      <li
                        key={o}
                        className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary"
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI modules */}
      <section id="ai" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI modules</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Ten analysis modules, one behavioural report
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {AI_MODULES.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 5) * 0.05, duration: 0.4 }}
            >
              <Card className="h-full gap-0 rounded-2xl border-border/70 p-5 shadow-soft">
                <h3 className="text-sm font-semibold tracking-tight">{m.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AI_MODEL_STACK.map((g) => (
            <Card key={g.group} className="gap-0 rounded-2xl border-border/70 bg-gradient-surface p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{g.group}</p>
              <ul className="mt-2 space-y-1">
                {g.items.map((i) => (
                  <li key={i} className="truncate text-sm text-muted-foreground">{i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Outcomes */}
      <section className="bg-secondary/40 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OUTCOMES.map((o) => (
            <Card key={o.title} className="gap-0 rounded-3xl border-border/70 bg-card p-6 shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <o.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Why */}
      <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Why LumaPath AI</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Built to support clinicians, not to replace them
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_LUMAPATH.map((w) => (
            <Card key={w.title} className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
              <h3 className="text-base font-semibold tracking-tight">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Age bands */}
      <section id="ages" className="bg-secondary/40 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Age coverage</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Expectations calibrated to your child's stage
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AGE_BANDS.map((b) => (
              <Card key={b.id} className="gap-0 rounded-3xl border-border/70 bg-card p-6 shadow-soft">
                <h3 className="text-base font-semibold tracking-tight">{b.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Private by design", body: "Videos are read in your browser and shared only when you choose to." },
            { icon: Stethoscope, title: "Clinically framed", body: "Observations map to the Communication Matrix clinicians already use." },
            { icon: Users, title: "Never diagnostic", body: SCREENING_DISCLAIMER },
          ].map((t) => (
            <Card key={t.title} className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <t.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-aurora p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-white/10" />
          <h2 className="relative text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Record one interaction. Get objective answers.
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/85">
            Upload your first standardized video today and bring measured behaviour to your next appointment.
          </p>
          <Button
            asChild
            size="lg"
            className="relative mt-8 rounded-full bg-white px-7 text-primary hover:bg-white/90"
          >
            <Link to={primaryTo}>
              <Sparkles className="h-4 w-4" />
              {isAuthenticated ? "Go to dashboard" : "Get started free"}
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Logo />
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{SCREENING_DISCLAIMER}</p>
        </div>
      </footer>
    </div>
  );
}
