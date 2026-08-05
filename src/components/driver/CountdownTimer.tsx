"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** "mm:ss remaining" countdown; ticks each second and turns red under 5 min. */
export default function CountdownTimer({ endISO }: { endISO: string }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(endISO).getTime() - Date.now())
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, new Date(endISO).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [endISO]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const urgent = remainingMs < 5 * 60 * 1000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 tabular-nums ${
        urgent ? "text-red-400" : "text-ink-secondary"
      }`}
    >
      <Clock className="h-4 w-4" />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}{" "}
      remaining
    </span>
  );
}
