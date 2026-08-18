import type { VideoProbe } from "@/types";
import type { LockedSubject } from "@/services/ai/behaviourAnalysis.service";

/**
 * Holds the currently uploaded interaction video for the lifetime of the tab.
 * Object URLs cannot be persisted, so this deliberately lives outside the store.
 */
interface VideoSession {
  file: File;
  objectUrl: string;
  probe: VideoProbe;
  activityId: string;
  /** The child the parent identified on the first frame. */
  subject?: LockedSubject;
  /** Which numbered person the parent picked, for the edit flow. */
  subjectIndex?: number;
}

let current: VideoSession | null = null;
const byResult = new Map<string, VideoSession>();

export function setVideoSession(session: VideoSession) {
  if (current && current.objectUrl !== session.objectUrl) {
    const stillUsed = [...byResult.values()].some((s) => s.objectUrl === current!.objectUrl);
    if (!stillUsed) URL.revokeObjectURL(current.objectUrl);
  }
  current = session;
}

export function getVideoSession() {
  return current;
}

export function setSelectedSubject(subject: LockedSubject, subjectIndex: number) {
  if (!current) return;
  current = { ...current, subject, subjectIndex };
}

export function attachVideoToResult(resultId: string) {
  if (current) byResult.set(resultId, current);
}

export function getVideoForResult(resultId: string) {
  return byResult.get(resultId) ?? null;
}

/** Makes a previously analysed video the active session again (re-selection). */
export function restoreSessionForResult(resultId: string) {
  const session = byResult.get(resultId);
  if (session) current = session;
  return session ?? null;
}
