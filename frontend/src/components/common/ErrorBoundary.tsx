import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  /** Shown in the message so the parent knows what stopped working. */
  area?: string;
  /** Called on reset — use it to clear whatever state caused the throw. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes and shows something recoverable.
 *
 * The analysis pipeline touches video decoding, canvas, Web Audio and
 * MediaRecorder — all of which vary by browser and can throw in ways that are
 * impractical to enumerate. A blank white screen tells a worried parent
 * nothing; this at least says which part failed and offers a way forward.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left as console output deliberately — no error-reporting service is wired
    // up, and silently swallowing this would make support impossible.
    console.error("[LumaPath] Render error", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Card className="gap-0 rounded-3xl border-destructive/30 bg-destructive/5 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
          <TriangleAlert className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mt-5 text-lg font-semibold tracking-tight">
          {this.props.area ? `${this.props.area} stopped working` : "Something went wrong"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          This is a problem in the app, not with your recording or your child&apos;s results.
          Nothing has been lost.
        </p>
        <p className="mx-auto mt-3 max-w-md break-words font-mono text-xs text-muted-foreground">
          {error.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button className="rounded-xl" onClick={this.reset}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => window.location.assign("/dashboard")}
          >
            Back to dashboard
          </Button>
        </div>
      </Card>
    );
  }
}
