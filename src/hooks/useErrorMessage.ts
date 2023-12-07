import { useEffect, useState } from "react";

const errorMessageTimeout = 5_000; // 5 seconds

export function useErrorMessage(): [
  string | undefined,
  (message: string | undefined) => void,
] {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    const timeout = setTimeout(() => {
      setErrorMessage(undefined);
    }, errorMessageTimeout);
    return () => clearTimeout(timeout);
  }, [errorMessage]);

  return [errorMessage, setErrorMessage];
}
