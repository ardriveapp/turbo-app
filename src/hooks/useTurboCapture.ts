import { useState, useCallback } from 'react';
import {
  captureScreenshot,
  createCaptureFile,
  type CaptureOptions,
  type CaptureResult
} from '../lib/turboCaptureClient';

export function useTurboCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [captureFile, setCaptureFile] = useState<File | null>(null);

  const capture = useCallback(async (url: string, options?: Partial<CaptureOptions>) => {
    setIsCapturing(true);
    setError(null);
    setResult(null);
    setCaptureFile(null);

    try {
      // Capture screenshot from service
      const captureResult = await captureScreenshot({
        url,
        ...options,
      });

      // Convert to File object for upload
      const file = createCaptureFile(captureResult, url);

      setResult(captureResult);
      setCaptureFile(file);

      return { result: captureResult, file };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture screenshot';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsCapturing(false);
    setError(null);
    setResult(null);
    setCaptureFile(null);
  }, []);

  return {
    capture,
    reset,
    isCapturing,
    error,
    result,
    captureFile,
  };
}
