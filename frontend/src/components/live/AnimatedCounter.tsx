import { useEffect, useRef, useState } from "react";

/** Smoothly tweens a numeric value for premium metric readouts. */
export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const raf = useRef(0);

  useEffect(() => {
    const from = shown;
    const start = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / 420);
      setShown(from + (value - from) * (1 - (1 - p) ** 3));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={className}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}