import { memo } from "react";

/**
 * Hero background with static clouds image and white overlay.
 */
export const HeroBackground = memo(function HeroBackground() {
  return (
    <div className="absolute inset-0">
      {/* Static clouds background image */}
      <img
        src="/cloud.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* White overlay for text readability */}
      <div className="absolute inset-0 bg-white/60" />
    </div>
  );
});

export default HeroBackground;
