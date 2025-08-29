import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
}

export default function BaseModal({ onClose, children, showCloseButton = false }: BaseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative z-10 bg-canvas border border-default rounded-lg shadow-xl">
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-fg-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}