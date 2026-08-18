/**
 * Audio analysis for uploaded interaction videos.
 *
 * Replaces the old placeholder that returned a fixed transcript. Everything
 * here is measured from the decoded PCM of the file the parent uploaded.
 *
 * **A limitation worth stating plainly:** this detects *voice activity*, not
 * *whose voice*. Separating the child from the caregiver needs speaker
 * diarisation, which is not implemented. Callers must therefore describe these
 * numbers as "voice activity in the recording", never as "the child's
 * vocalisations", and should reduce confidence accordingly.
 *
 * The energy VAD below is a real, standard technique — framing, an adaptive
 * noise floor from the signal's own quiet percentile, and hysteresis so a
 * single loud sample cannot open a segment. Silero VAD via onnxruntime-web is
 * a drop-in upgrade at `detectVoiceActivity`; the output shape stays the same.
 */

/** One contiguous stretch of voice activity. */
export interface VoiceSegment {
  startSec: number;
  endSec: number;
  /** Mean RMS across the segment, relative to the noise floor. */
  strength: number;
}

export interface AudioAnalysis {
  /** False when the file carries no decodable audio track. */
  available: boolean;
  durationSec: number;
  sampleRate: number;
  segments: VoiceSegment[];
  /** Count of distinct voice segments. Both speakers, undifferentiated. */
  voiceEvents: number;
  /** Fraction of the recording containing voice, 0–1. */
  voiceRatio: number;
  /** Voice segments per minute. */
  voiceRate: number;
  /** Estimated signal-to-noise in dB. Low values make everything less reliable. */
  snrDb: number;
  /** Median gap between segments — a rough proxy for turn-taking tempo. */
  medianGapMs: number;
  /** Human-readable notes for the report. */
  notes: string[];
}

export const EMPTY_AUDIO_ANALYSIS: AudioAnalysis = {
  available: false,
  durationSec: 0,
  sampleRate: 0,
  segments: [],
  voiceEvents: 0,
  voiceRatio: 0,
  voiceRate: 0,
  snrDb: 0,
  medianGapMs: 0,
  notes: ["No audio track detected — vocal measures unavailable."],
};

/* ------------------------------------------------------------- decoding --- */

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Decodes the audio track of a video (or audio) file to mono PCM.
 *
 * Returns null when the file has no audio, or when the browser cannot decode
 * that codec — both are normal, and callers should degrade rather than fail.
 */
export async function decodeAudioTrack(file: File): Promise<AudioBuffer | null> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;

  const ctx = new Ctor();
  try {
    const bytes = await file.arrayBuffer();
    return await ctx.decodeAudioData(bytes);
  } catch {
    // Container has no audio stream, or the codec is unsupported here.
    return null;
  } finally {
    void ctx.close();
  }
}

/** Averages all channels down to one Float32Array. */
function toMono(buffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = buffer;
  if (numberOfChannels === 1) return buffer.getChannelData(0);

  const mono = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  for (let i = 0; i < length; i++) mono[i] /= numberOfChannels;
  return mono;
}

/* ------------------------------------------------------------------ VAD --- */

const FRAME_MS = 30;
/** Frames above threshold needed to open a segment — rejects transient clicks. */
const ATTACK_FRAMES = 3;
/** Frames below threshold needed to close one — bridges gaps within a word. */
const RELEASE_FRAMES = 5;
/** Segments shorter than this are noise, not speech. */
const MIN_SEGMENT_MS = 120;

function percentile(sorted: Float32Array | number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[i];
}

/**
 * Energy-based voice activity detection with an adaptive noise floor.
 *
 * Swap point for Silero VAD: replace the body, keep the return type.
 */
export function detectVoiceActivity(buffer: AudioBuffer): AudioAnalysis {
  const samples = toMono(buffer);
  const { sampleRate, duration } = buffer;
  const frameLen = Math.max(1, Math.round((sampleRate * FRAME_MS) / 1000));
  const frameCount = Math.floor(samples.length / frameLen);

  if (frameCount < 4) {
    return { ...EMPTY_AUDIO_ANALYSIS, notes: ["Audio track too short to analyse."] };
  }

  // RMS per frame.
  const energies = new Float32Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    const start = f * frameLen;
    for (let i = start; i < start + frameLen; i++) sum += samples[i] * samples[i];
    energies[f] = Math.sqrt(sum / frameLen);
  }

  // Noise floor from the signal's own quiet end, so the threshold adapts to the
  // room rather than assuming a fixed level.
  const sorted = Float32Array.from(energies).sort();
  const noiseFloor = Math.max(1e-5, percentile(sorted, 0.1));
  const loud = Math.max(noiseFloor * 1.5, percentile(sorted, 0.95));
  const threshold = noiseFloor + (loud - noiseFloor) * 0.25;

  // Hysteresis pass.
  const segments: VoiceSegment[] = [];
  let inVoice = false;
  let above = 0;
  let below = 0;
  let segStart = 0;
  let segSum = 0;
  let segFrames = 0;

  const frameToSec = (f: number) => (f * frameLen) / sampleRate;

  for (let f = 0; f < frameCount; f++) {
    const isVoice = energies[f] > threshold;

    if (!inVoice) {
      above = isVoice ? above + 1 : 0;
      if (above >= ATTACK_FRAMES) {
        inVoice = true;
        segStart = f - ATTACK_FRAMES + 1;
        segSum = 0;
        segFrames = 0;
        below = 0;
      }
    } else {
      segSum += energies[f];
      segFrames++;
      below = isVoice ? 0 : below + 1;
      if (below >= RELEASE_FRAMES) {
        const endFrame = f - RELEASE_FRAMES + 1;
        pushSegment(segments, segStart, endFrame, segSum, segFrames, frameToSec, noiseFloor);
        inVoice = false;
        above = 0;
      }
    }
  }
  if (inVoice) {
    pushSegment(segments, segStart, frameCount, segSum, segFrames, frameToSec, noiseFloor);
  }

  const voicedSec = segments.reduce((a, s) => a + (s.endSec - s.startSec), 0);
  const voiceRatio = duration > 0 ? Math.min(1, voicedSec / duration) : 0;

  const gaps: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    gaps.push((segments[i].startSec - segments[i - 1].endSec) * 1000);
  }
  gaps.sort((a, b) => a - b);

  const snrDb = Number((20 * Math.log10(loud / noiseFloor)).toFixed(1));

  const notes: string[] = [];
  if (snrDb < 10) notes.push("Low signal-to-noise — vocal measures are unreliable in this recording.");
  else if (snrDb < 18) notes.push("Moderate background noise may affect vocal measures.");
  if (segments.length === 0) notes.push("No voice activity detected above the noise floor.");
  notes.push("Voice activity includes both child and caregiver — speakers are not separated.");

  return {
    available: true,
    durationSec: duration,
    sampleRate,
    segments,
    voiceEvents: segments.length,
    voiceRatio,
    voiceRate: duration > 0 ? segments.length / (duration / 60) : 0,
    snrDb,
    medianGapMs: gaps.length ? Math.round(percentile(gaps, 0.5)) : 0,
    notes,
  };
}

function pushSegment(
  out: VoiceSegment[],
  startFrame: number,
  endFrame: number,
  sum: number,
  frames: number,
  frameToSec: (f: number) => number,
  noiseFloor: number,
): void {
  const startSec = frameToSec(startFrame);
  const endSec = frameToSec(endFrame);
  if ((endSec - startSec) * 1000 < MIN_SEGMENT_MS) return;
  out.push({
    startSec,
    endSec,
    strength: frames > 0 ? sum / frames / noiseFloor : 0,
  });
}

/* ------------------------------------------------------------- pipeline --- */

/** Decode + analyse in one call. Never throws; returns the empty result instead. */
export async function analyseAudioTrack(file: File): Promise<AudioAnalysis> {
  try {
    const buffer = await decodeAudioTrack(file);
    if (!buffer) return EMPTY_AUDIO_ANALYSIS;
    return detectVoiceActivity(buffer);
  } catch {
    return EMPTY_AUDIO_ANALYSIS;
  }
}

/**
 * Response latency measured across modalities: a voice segment ends (the prompt),
 * then movement rises (the reaction). Only pairs within `maxGapSec` count.
 *
 * Returns null when there is nothing to measure — better than a default that
 * looks like a finding.
 */
export function measureResponseLatency(
  segments: VoiceSegment[],
  motionByTime: Array<{ t: number; motion: number }>,
  maxGapSec = 4,
): { meanMs: number; trials: number } | null {
  if (segments.length === 0 || motionByTime.length < 2) return null;

  const mean = motionByTime.reduce((a, m) => a + m.motion, 0) / motionByTime.length;
  const reactionThreshold = mean * 1.25;
  const latencies: number[] = [];

  for (const segment of segments) {
    const reaction = motionByTime.find(
      (m) => m.t > segment.endSec && m.t - segment.endSec <= maxGapSec && m.motion > reactionThreshold,
    );
    if (reaction) latencies.push((reaction.t - segment.endSec) * 1000);
  }

  if (latencies.length === 0) return null;
  return {
    meanMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    trials: latencies.length,
  };
}
