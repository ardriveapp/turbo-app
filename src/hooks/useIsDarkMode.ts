import { useState, useEffect } from "react";

export function useIsDarkMode(): boolean {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check the current theme using matchMedia
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Update the theme on changes
    const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);

    // Cleanup event listener on component unmount
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  return isDarkMode;
}
