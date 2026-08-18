/**
 * Client for the LumaPath backend API (see `backend/`).
 *
 * Every request carries the caller's Supabase access token. The backend uses a
 * service-role key that bypasses Row Level Security, so it verifies that token
 * and re-checks ownership itself before touching any child's data.
 */
import { supabase } from "@/lib/supabase/client";

const BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "");

/** True when a backend URL is configured. Falls back to direct Supabase when not. */
export const isBackendConfigured = Boolean(BASE_URL);

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!BASE_URL) {
    throw new BackendError("VITE_BACKEND_URL is not set.", 0);
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new BackendError("You need to be signed in to do that.", 401);
  }

  return fetch(`${BASE_URL}/v1${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

async function unwrap<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;

  let detail = `Request failed with status ${response.status}.`;
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) detail = body.detail;
  } catch {
    /* non-JSON error body — keep the status-based message */
  }
  throw new BackendError(detail, response.status);
}

export interface SaveResultPayload {
  childId: string;
  ageBandId: string;
  overallScore: number;
  confidence: number;
  riskLevel: string;
  matrixLevel: number;
  matrixLevelName: string;
  responseLatencyMs: number;
  faceDetectionRate?: number;
  scores: Record<string, number>;
  aiExplanation?: string;
  observations?: string[];
  riskFactors?: string[];
  timeline?: Array<{ atSec: number; label: string; kind: string; detail: string }>;
  source?: "video" | "manual" | "live";
  activityId?: string;
  analysisData?: unknown;
}

export interface SaveResultResponse {
  resultId: string;
  assessmentId: string;
}

/** Persists a completed analysis so it survives beyond this browser session. */
export async function saveResult(payload: SaveResultPayload): Promise<SaveResultResponse> {
  const response = await authorizedFetch("/analysis/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrap<SaveResultResponse>(response);
}

export interface BackendHealth {
  status: "ok" | "degraded";
  supabaseConfigured: boolean;
  version: string;
}

/** Unauthenticated liveness check — useful for a setup screen. */
export async function checkHealth(): Promise<BackendHealth> {
  if (!BASE_URL) throw new BackendError("VITE_BACKEND_URL is not set.", 0);
  return unwrap<BackendHealth>(await fetch(`${BASE_URL}/v1/health`));
}
