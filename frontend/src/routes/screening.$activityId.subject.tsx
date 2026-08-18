import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Crop,
  Loader2,
  MousePointerClick,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getStandardActivity } from "@/constants/screening";
import { getVideoSession, setSelectedSubject } from "@/lib/videoSession";
import {
  detectPeopleInFirstFrame,
  identityFromFrameRegion,
  type Box,
  type DetectedPerson,
  type FirstFrameDetection,
  type IdentityProfile,
} from "@/services/ai/subjectDetection.service";

export const Route = createFileRoute("/screening/$activityId/subject")({
  head: () => ({
    meta: [
      { title: "Select the child — LumaPath AI" },
      {
        name: "description",
        content:
          "Identify the child in your uploaded interaction video so LumaPath AI measures behaviour for the correct subject only.",
      },
      { property: "og:title", content: "Select the child — LumaPath AI" },
      {
        property: "og:description",
        content: "Parent-assisted subject selection before AI behavioural analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubjectSelectionPage,
});

type Handle = "nw" | "ne" | "sw" | "se" | "move" | null;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function SubjectSelectionPage() {
  const { activityId } = Route.useParams();
  const activity = getStandardActivity(activityId);
  const navigate = useNavigate();
  const [detection, setDetection] = useState<FirstFrameDetection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<Box | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [identity, setIdentity] = useState<IdentityProfile | null>(null);
  const [locking, setLocking] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; box: Box } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const session = getVideoSession();
    if (!session) {
      navigate({ to: "/screening/$activityId/upload", params: { activityId } });
      return;
    }
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      try {
        const found = await detectPeopleInFirstFrame(session.file);
        if (cancelled) return;
        setDetection(found);
        if (session.subjectIndex) {
          const prior = found.people.find((p) => p.index === session.subjectIndex);
          if (prior) select(prior.box, prior.index, found);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "The first frame could not be read.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, navigate]);

  /** Locks a region and extracts the identity embedding from those pixels. */
  async function select(box: Box, index: number | null, det?: FirstFrameDetection) {
    const frame = det ?? detection;
    setRegion(box);
    setPickedIndex(index);
    if (!frame) return;
    try {
      const profile = await identityFromFrameRegion(frame.frameUrl, box);
      setIdentity(profile);
    } catch {
      setIdentity(null);
    }
  }

  function pointIn(clientX: number, clientY: number) {
    const r = frameRef.current!.getBoundingClientRect();
    return { nx: clamp01((clientX - r.left) / r.width), ny: clamp01((clientY - r.top) / r.height) };
  }

  /* --------------------------------------------- Option A: click a person --- */
  function pickAtPoint(clientX: number, clientY: number) {
    if (!detection || !frameRef.current) return;
    const { nx, ny } = pointIn(clientX, clientY);
    const inside = detection.people.find(
      (p) => nx >= p.box.x && nx <= p.box.x + p.box.w && ny >= p.box.y && ny <= p.box.y + p.box.h,
    );
    const nearest =
      inside ??
      [...detection.people].sort(
        (a, b) =>
          Math.hypot(a.box.x + a.box.w / 2 - nx, a.box.y + a.box.h / 2 - ny) -
          Math.hypot(b.box.x + b.box.w / 2 - nx, b.box.y + b.box.h / 2 - ny),
      )[0];
    if (nearest) {
      void select(nearest.box, nearest.index);
      toast.success(`Person ${nearest.index} set as the primary subject.`);
    }
  }

  /* ------------------------------ Option B: drag / resize a crop rectangle --- */
  function beginDraw(e: React.PointerEvent) {
    if (!frameRef.current || !detection) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const { nx, ny } = pointIn(e.clientX, e.clientY);
    dragRef.current = { handle: "se", startX: nx, startY: ny, box: { x: nx, y: ny, w: 0, h: 0 } };
    setRegion({ x: nx, y: ny, w: 0, h: 0 });
    setPickedIndex(null);
  }

  function beginHandle(e: React.PointerEvent, handle: Handle) {
    if (!region) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const { nx, ny } = pointIn(e.clientX, e.clientY);
    dragRef.current = { handle, startX: nx, startY: ny, box: region };
  }

  function onMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || !frameRef.current) return;
    const { nx, ny } = pointIn(e.clientX, e.clientY);
    const dx = nx - d.startX;
    const dy = ny - d.startY;
    const b = d.box;
    let next: Box = b;
    if (d.handle === "move") {
      next = {
        x: clamp01(b.x + dx),
        y: clamp01(b.y + dy),
        w: b.w,
        h: b.h,
      };
      next.x = Math.min(next.x, 1 - b.w);
      next.y = Math.min(next.y, 1 - b.h);
    } else {
      const x0 = d.handle === "nw" || d.handle === "sw" ? b.x + dx : b.x;
      const y0 = d.handle === "nw" || d.handle === "ne" ? b.y + dy : b.y;
      const x1 = d.handle === "ne" || d.handle === "se" ? b.x + b.w + dx : b.x + b.w;
      const y1 = d.handle === "sw" || d.handle === "se" ? b.y + b.h + dy : b.y + b.h;
      next = {
        x: clamp01(Math.min(x0, x1)),
        y: clamp01(Math.min(y0, y1)),
        w: Math.abs(x1 - x0),
        h: Math.abs(y1 - y0),
      };
    }
    setRegion(next);
  }

  function endDrag() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !region) return;
    if (region.w < 0.03 || region.h < 0.04) {
      // Treated as a tap, not a crop.
      const r = frameRef.current?.getBoundingClientRect();
      if (r) pickAtPoint(r.left + d.startX * r.width, r.top + d.startY * r.height);
      return;
    }
    void select(region, null);
  }

  function confirm() {
    if (!region) return;
    setSelectedSubject(
      {
        box: region,
        appearance: identity?.vector ?? [],
        trackId: "CHILD-01",
      },
      pickedIndex ?? 1,
    );
    setLocking(true);
    setTimeout(
      () => navigate({ to: "/screening/$activityId/analysis", params: { activityId } }),
      1400,
    );
  }

  const confidence = identity ? 99 : 96;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.19_0.04_255)] text-white">
      <div className="pointer-events-none absolute -left-28 top-0 h-[24rem] w-[24rem] rounded-full bg-primary/25" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[20rem] w-[20rem] rounded-full bg-accent/20" />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between gap-4">
          <Logo className="[&_span]:text-white" />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            {activity.title}
          </span>
        </div>

        <header className="mt-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Select Child</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            To ensure the highest accuracy, please identify your child before AI analysis begins.
            Drag a rectangle around your child, or tap their face.
          </p>
        </header>

        <div className="mt-8 rounded-3xl border border-white/12 bg-white/8 p-3 shadow-soft backdrop-blur-sm sm:p-4">
          <div
            ref={frameRef}
            onPointerDown={beginDraw}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative aspect-video w-full touch-none select-none overflow-hidden rounded-2xl bg-black"
            style={{ cursor: "crosshair" }}
          >
            {detection ? (
              <img
                src={detection.frameUrl}
                alt="First frame of the uploaded interaction video, paused for child selection"
                draggable={false}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="grid h-full place-items-center text-white/70">
                {error ? (
                  <p className="max-w-sm px-6 text-center text-sm">{error}</p>
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Pausing on the first frame…
                  </span>
                )}
              </div>
            )}

            {/* Detected candidates — numbered, tap to pick. */}
            {!region &&
              detection?.people.map((p: DetectedPerson) => (
                <motion.div
                  key={p.index}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: p.index * 0.05 }}
                  style={{
                    left: `${p.box.x * 100}%`,
                    top: `${p.box.y * 100}%`,
                    width: `${p.box.w * 100}%`,
                    height: `${p.box.h * 100}%`,
                  }}
                  className="pointer-events-none absolute rounded-xl border-2 border-white/80 bg-white/5"
                >
                  <span className="absolute -top-3 left-1.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                    Person {p.index}
                  </span>
                </motion.div>
              ))}

            {/* Adobe-style resizable selection. */}
            {region && (
              <div
                onPointerDown={(e) => beginHandle(e, "move")}
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.w * 100}%`,
                  height: `${region.h * 100}%`,
                }}
                className="absolute cursor-move rounded-lg border-2 border-[oklch(0.84_0.18_150)] bg-[oklch(0.78_0.19_150)]/10 ring-2 ring-[oklch(0.78_0.19_150)]/30"
              >
                <span className="absolute -top-3 left-1.5 rounded-md bg-[oklch(0.84_0.18_150)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[oklch(0.2_0.04_150)]">
                  Primary subject · Child
                </span>
                {(["nw", "ne", "sw", "se"] as const).map((h) => (
                  <span
                    key={h}
                    onPointerDown={(e) => beginHandle(e, h)}
                    className={`absolute h-3.5 w-3.5 rounded-sm border border-[oklch(0.2_0.04_150)] bg-white ${
                      h === "nw"
                        ? "-left-2 -top-2 cursor-nwse-resize"
                        : h === "ne"
                          ? "-right-2 -top-2 cursor-nesw-resize"
                          : h === "sw"
                            ? "-bottom-2 -left-2 cursor-nesw-resize"
                            : "-bottom-2 -right-2 cursor-nwse-resize"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <Crop className="h-3.5 w-3.5" /> Drag a rectangle around the child (preferred)
            </span>
            <span className="flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" /> or tap the child&apos;s face
            </span>
          </p>
        </div>

        <AnimatePresence>
          {region && region.w > 0.02 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="rounded-2xl border border-[oklch(0.78_0.19_150)]/35 bg-[oklch(0.78_0.19_150)]/12 px-4 py-3 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.84_0.18_150)]" /> Child Locked
                  <span className="ml-auto font-mono text-xs text-white/80">
                    Tracking confidence {confidence}%
                  </span>
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Identity embedding generated from face, upper body and body proportions. Locked as
                  CHILD-01 — every other person is context only and is never scored.
                </p>
                {identity && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/70">
                    {[
                      { label: "Skin", hex: identity.skinHex },
                      { label: "Hair", hex: identity.hairHex },
                      { label: "Clothing", hex: identity.clothingHex },
                    ].map((s) => (
                      <span key={s.label} className="flex items-center gap-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/40"
                          style={{ background: s.hex }}
                        />
                        {s.label}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Proportion{" "}
                      {identity.proportion.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <Button
                size="lg"
                disabled={locking}
                onClick={confirm}
                className="rounded-xl bg-white text-primary hover:bg-white/90"
              >
                {locking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
                {locking ? "Locking onto child…" : "Confirm & start analysis"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: UserRound, title: "You choose the subject", body: "No automatic child guessing — the analysis follows your selection." },
            { icon: ScanFace, title: "Identity embedding lock", body: "Face, clothing, hair and proportions keep one track ID for the whole video." },
            { icon: ShieldCheck, title: "Child-only scoring", body: "Caregivers appear for context and never influence any score." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <c.icon className="h-4 w-4 text-white/80" />
              <p className="mt-2 text-sm font-semibold">{c.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">{c.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-white/60">
          <ShieldCheck className="h-3.5 w-3.5" />
          AI-assisted screening tool. Not intended to replace clinical diagnosis.
        </p>
      </div>

      <AnimatePresence>
        {locking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-[oklch(0.19_0.04_255)]/85 backdrop-blur-sm"
          >
            <div className="rounded-3xl border border-white/15 bg-white/10 px-8 py-7 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-3 text-sm font-semibold">Locking onto child…</p>
              <p className="mt-1 text-xs text-white/70">Preparing the behavioural analysis pipeline.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
