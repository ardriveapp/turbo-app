import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { BANNER_CONFIG, DISMISSED_BANNERS_KEY } from '../config/banner';

export default function Banner() {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash

  useEffect(() => {
    // Check if this banner has been dismissed
    const dismissedBanners = JSON.parse(
      localStorage.getItem(DISMISSED_BANNERS_KEY) || '[]'
    ) as string[];

    setIsDismissed(dismissedBanners.includes(BANNER_CONFIG.id));
  }, []);

  const handleDismiss = () => {
    // Add this banner's id to dismissed list
    const dismissedBanners = JSON.parse(
      localStorage.getItem(DISMISSED_BANNERS_KEY) || '[]'
    ) as string[];

    if (!dismissedBanners.includes(BANNER_CONFIG.id)) {
      dismissedBanners.push(BANNER_CONFIG.id);
      localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(dismissedBanners));
    }

    setIsDismissed(true);
  };

  // Don't render if banner is disabled or dismissed
  if (!BANNER_CONFIG.enabled || isDismissed) {
    return null;
  }

  const isSubtle = BANNER_CONFIG.variant === 'subtle';

  return (
    <div
      className={`w-full py-2.5 px-4 ${
        isSubtle
          ? 'bg-lavender text-primary'
          : 'bg-primary text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 relative">
        <p className="text-sm font-medium text-center pr-8">
          {BANNER_CONFIG.message}
          {BANNER_CONFIG.link && (
            <>
              {' '}
              <a
                href={BANNER_CONFIG.link.href}
                target={BANNER_CONFIG.link.external ? '_blank' : undefined}
                rel={BANNER_CONFIG.link.external ? 'noopener noreferrer' : undefined}
                className={`inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity ${
                  isSubtle ? 'text-primary' : 'text-white'
                }`}
              >
                {BANNER_CONFIG.link.text}
                {BANNER_CONFIG.link.external && (
                  <ExternalLink className="w-3 h-3" />
                )}
              </a>
            </>
          )}
        </p>

        <button
          onClick={handleDismiss}
          className={`absolute right-0 p-1 rounded-full transition-colors ${
            isSubtle
              ? 'hover:bg-primary/10 text-primary/60 hover:text-primary'
              : 'hover:bg-white/10 text-white/60 hover:text-white'
          }`}
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
