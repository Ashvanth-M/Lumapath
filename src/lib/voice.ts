/** Lightweight voice guidance built on the Web Speech API. Safe on the server. */
let enabled = true;

export function setVoiceEnabled(next: boolean) {
  enabled = next;
  if (!next) cancelVoice();
}

export function isVoiceSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function cancelVoice() {
  if (isVoiceSupported()) window.speechSynthesis.cancel();
}

export function speak(text: string, opts: { rate?: number; pitch?: number } = {}) {
  if (!enabled || !isVoiceSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1.05;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  } catch {
    /* voice guidance is best-effort */
  }
}