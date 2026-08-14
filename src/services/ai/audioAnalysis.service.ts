/**
 * Placeholder for the future audio pipeline (OpenAI Whisper transcription +
 * prosody & auditory-response modelling). Swap for `/v1/analysis/audio`.
 */
export interface AudioAnalysisResponse {
  transcript: string;
  vocalTurns: number;
  speechScore: number;
  auditoryResponseScore: number;
}

export async function analyzeAudio(assessmentId: string): Promise<AudioAnalysisResponse> {
  await new Promise((r) => setTimeout(r, 500));
  void assessmentId;
  return {
    transcript: "[caregiver] Zuri… Zuri, look! [child] ba… ba-ba [caregiver] Yes, ball!",
    vocalTurns: 11,
    speechScore: 68,
    auditoryResponseScore: 74,
  };
}