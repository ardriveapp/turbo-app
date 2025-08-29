import { useEffect, useState } from "react";
import { defaultDebounceMs } from "../constants";

export default function useDebounce<T>(
  value: T,
  delay: number = defaultDebounceMs,
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}