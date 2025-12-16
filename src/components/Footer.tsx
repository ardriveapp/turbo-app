import { Github, Twitter, MessageCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-default bg-[#090909]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-xs text-link truncate">
              © {currentYear} PDS Inc.
            </div>
            <a 
              href="https://github.com/ardriveapp/turbo-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-link/60 hover:text-link transition-colors cursor-pointer flex-shrink-0" 
              title={`Built: ${import.meta.env.BUILD_TIME || 'Unknown'} • Click to view source code`}
            >
              v{import.meta.env.PACKAGE_VERSION || '0.9.0'}
            </a>
          </div>
          
          {/* Social Icons */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <a
              href="https://twitter.com/ar_io_network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:text-fg-muted transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/ardriveapp/turbo-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:text-fg-muted transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://discord.com/invite/HGG52EtTc2"
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