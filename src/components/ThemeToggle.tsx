import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../store/useStore';

interface ThemeToggleProps {
  /** Show as segmented button group (default) or dropdown */
  variant?: 'segmented' | 'compact';
  /** Additional className for the container */
  className?: string;
}

/**
 * Theme toggle component for switching between light, dark, and system themes.
 */
export function ThemeToggle({ variant = 'segmented', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  if (variant === 'compact') {
    // Compact: Single button that cycles through themes
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    const Icon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

    return (
      <button
        onClick={() => handleThemeChange(nextTheme)}
        className={`p-2 rounded-lg bg-card border border-border/20 hover:border-primary/50 transition-colors ${className}`}
        title={`Theme: ${theme} (click to change)`}
        aria-label={`Current theme: ${theme}. Click to switch.`}
      >
        <Icon className="w-4 h-4 text-foreground/80" />
      </button>
    );
  }

  // Segmented: Three-button group
  return (
    <div className={`inline-flex bg-card rounded-2xl p-1 border border-border/20 ${className}`}>
      <button
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
          theme === 'light'
            ? 'bg-primary text-white'
            : 'text-foreground/80 hover:text-foreground'
        }`}
        onClick={() => handleThemeChange('light')}
        aria-pressed={theme === 'light'}
        title="Light theme"
      >
        <Sun className="w-4 h-4" />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
          theme === 'system'
            ? 'bg-primary text-white'
            : 'text-foreground/80 hover:text-foreground'
        }`}
        onClick={() => handleThemeChange('system')}
        aria-pressed={theme === 'system'}
        title="System theme (follows OS preference)"
      >
        <Monitor className="w-4 h-4" />
        <span className="hidden sm:inline">System</span>
      </button>
      <button
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
          theme === 'dark'
            ? 'bg-primary text-white'
            : 'text-foreground/80 hover:text-foreground'
        }`}
        onClick={() => handleThemeChange('dark')}
        aria-pressed={theme === 'dark'}
        title="Dark theme"
      >
        <Moon className="w-4 h-4" />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}

export default ThemeToggle;
