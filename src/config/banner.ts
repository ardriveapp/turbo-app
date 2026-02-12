// Banner configuration
// To show a banner, set enabled: true and update the id, message, and optional link
// Each banner should have a unique id so dismissals are tracked separately

export interface BannerConfig {
  enabled: boolean;
  id: string;  // Unique identifier for localStorage tracking
  message: string;
  link?: {
    text: string;
    href: string;
    external?: boolean;
  };
  variant: 'subtle' | 'prominent';  // subtle = lavender, prominent = purple
}

export const BANNER_CONFIG: BannerConfig = {
  enabled: true,
  id: 'console-rebrand-feb-2025',
  message: 'The Turbo app is now the ar.io Console — same tools, new home.',
  link: undefined,
  variant: 'subtle',
};

// LocalStorage key for tracking dismissed banners
export const DISMISSED_BANNERS_KEY = 'ario-dismissed-banners';
