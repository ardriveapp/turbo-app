// Turbo Capture API Client
// Integrates with turbo-capture-service for screenshot capture

import { useStore } from '../store/useStore';

const CAPTURE_TIMEOUT_MS = 90000; // 90 seconds

/**
 * Get the Capture Service URL from store configuration
 */
function getCaptureServiceUrl(): string {
  const config = useStore.getState().getCurrentConfig();
  return config.captureServiceUrl;
}

export interface CaptureOptions {
  url: string;
  waitFor?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  fullPage?: boolean;
}

export interface CaptureResult {
  screenshot: string;      // Base64-encoded PNG
  finalUrl: string;       // Final URL after redirects
  title: string;          // Page title
  size: number;           // Screenshot size in bytes
  capturedAt: string;     // ISO timestamp
  viewport: {
    width: number;
    height: number;
  };
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  captures: number;
  totalBytes: number;
  totalBytesFormatted: string;
  uptime: string;
  uptimeSeconds: number;
}

/**
 * Check if Turbo Capture service is available
 */
export async function checkHealth(): Promise<HealthStatus> {
  const baseUrl = getCaptureServiceUrl();
  const response = await fetch(`${baseUrl}/health`, {
    signal: AbortSignal.timeout(2000),
  });

  if (!response.ok) {
    throw new Error('Turbo Capture service is not available');
  }

  return response.json();
}

/**
 * Capture a screenshot of a URL
 */
export async function captureScreenshot(
  options: CaptureOptions
): Promise<CaptureResult> {
  const baseUrl = getCaptureServiceUrl();
  const response = await fetch(`${baseUrl}/screenshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: options.url,
      waitFor: options.waitFor || 5000,
      viewportWidth: options.viewportWidth || 1280,
      viewportHeight: options.viewportHeight || 800,
      fullPage: options.fullPage !== undefined ? options.fullPage : true,
    }),
    signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to capture screenshot' }));
    throw new Error(error.message || 'Failed to capture screenshot');
  }

  return response.json();
}

/**
 * Convert base64 screenshot to Blob for upload
 */
export function base64ToBlob(base64: string, contentType = 'image/png'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Create a File object from screenshot result with proper naming
 * Format: capture-{domain}-{timestamp}.png
 * Truncates long domains to max 50 characters
 */
export function createCaptureFile(screenshot: CaptureResult, originalUrl: string): File {
  try {
    // Extract domain from URL
    const url = new URL(originalUrl);
    let domain = url.hostname;

    // Remove www. prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    // Truncate domain if too long (max 50 chars)
    if (domain.length > 50) {
      domain = domain.substring(0, 47) + '...';
    }

    // Create timestamp
    const timestamp = Date.now();

    // Create filename
    const fileName = `capture-${domain}-${timestamp}.png`;

    // Convert base64 to blob
    const blob = base64ToBlob(screenshot.screenshot);

    // Create File object
    return new File([blob], fileName, { type: 'image/png' });
  } catch (error) {
    // Fallback if URL parsing fails
    const timestamp = Date.now();
    const fileName = `capture-${timestamp}.png`;
    const blob = base64ToBlob(screenshot.screenshot);
    return new File([blob], fileName, { type: 'image/png' });
  }
}
