import { Github, Twitter, MessageCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-default bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="text-xs text-link">
              © {currentYear} Permanent Data Solutions Inc. Powered by AR.IO.
            </div>
            <div className="text-xs text-link/60" title={`Built: ${import.meta.env.BUILD_TIME || 'Unknown'}`}>
              v{import.meta.env.PACKAGE_VERSION || '0.1.0'}
            </div>
          </div>
          
          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/ardriveapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:text-fg-muted transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/ardriveapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:text-fg-muted transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://discord.gg/ardrive"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:text-fg-muted transition-colors"
              aria-label="Discord"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
         </div>
        </div>
      </div>
    </footer>
  );
}