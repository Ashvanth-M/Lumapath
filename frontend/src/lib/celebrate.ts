/** Confetti celebration used after a successful assessment. Client-only. */
export async function celebrate() {
  if (typeof window === "undefined") return;
  const { default: confetti } = await import("canvas-confetti");
  const base = { spread: 78, ticks: 220, gravity: 0.9, scalar: 1, zIndex: 60 };
  confetti({ ...base, particleCount: 80, origin: { x: 0.5, y: 0.62 } });
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 60, origin: { x: 0, y: 0.75 } }), 160);
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 120, origin: { x: 1, y: 0.75 } }), 260);
}