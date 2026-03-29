import { useEffect, useRef } from "react";

export function useAutoSave<T>(
  value: T,
  saveFn: (v: T) => Promise<void>,
  delay = 1500,
) {
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const latest = useRef<T>(value);
  const saveFnRef = useRef(saveFn);
  latest.current = value;
  saveFnRef.current = saveFn;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveFnRef.current(latest.current);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  // saveFnRef and latest are refs — intentionally excluded from deps.
  // Only the value changing should trigger a new save timer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);
}
