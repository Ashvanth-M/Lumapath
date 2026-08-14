import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CheckCircle2, CloudUpload, FileVideo, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/assessment/$bandId/upload")({
  head: () => ({
    meta: [
      { title: "Uploading session — LumaPath AI" },
      { name: "description", content: "Securely compressing and uploading your child's session video." },
      { property: "og:title", content: "Uploading session — LumaPath AI" },
      { property: "og:description", content: "Securely compressing and uploading the session video." },
    ],
  }),
  component: UploadScreen,
});

function UploadScreen() {
  const { bandId } = Route.useParams();
  const navigate = useNavigate();
  const [compress, setCompress] = useState(0);
  const [upload, setUpload] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setCompress((c) => {
        if (c < 100) return Math.min(100, c + 7);
        setUpload((u) => Math.min(100, u + 5));
        return c;
      });
    }, 120);
    return () => clearInterval(t);
  }, []);

  const done = upload >= 100;

  return (
    <AppShell title="Uploading session" subtitle="Compressing locally, then transferring over an encrypted channel.">
      <div className="mx-auto max-w-lg">
        <Card className="gap-0 rounded-3xl border-border/70 p-8 text-center shadow-lift">
          <motion.div
            animate={done ? { scale: [0.9, 1] } : { y: [0, -8, 0] }}
            transition={done ? { duration: 0.4 } : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-aurora text-white shadow-glow"
          >
            {done ? <CheckCircle2 className="h-9 w-9" /> : <CloudUpload className="h-9 w-9" />}
          </motion.div>

          <h2 className="mt-6 text-xl font-semibold tracking-tight">
            {failed ? "Upload interrupted" : done ? "Upload complete" : "Preparing your session"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {failed
              ? "The connection dropped at 62%. Your recording is saved locally — retry when ready."
              : done
                ? "Your video is safely stored and queued for AI analysis."
                : "Large videos are compressed on-device to protect your data allowance."}
          </p>

          <div className="mt-7 space-y-5 text-left">
            <ProgressRow icon={FileVideo} label="Compression" value={compress} />
            <ProgressRow icon={CloudUpload} label="Secure upload" value={failed ? 62 : upload} />
          </div>

          <div className="mt-8 flex flex-col gap-2">
            {failed ? (
              <Button
                className="rounded-xl"
                onClick={() => {
                  setFailed(false);
                  setUpload(65);
                }}
              >
                <RotateCcw className="h-4 w-4" /> Retry upload
              </Button>
            ) : (
              <Button
                className="rounded-xl"
                disabled={!done}
                onClick={() => navigate({ to: "/assessment/$bandId/processing", params: { bandId } })}
              >
                Continue to AI analysis
              </Button>
            )}
            {failed && (
              <Button variant="ghost" className="rounded-xl" onClick={() => setFailed(false)}>
                Continue without retrying
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ProgressRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CloudUpload;
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="tabular-nums text-muted-foreground">{Math.round(value)}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}