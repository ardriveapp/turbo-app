import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BaseModalProps {
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
}

export default function BaseModal({ onClose, children, showCloseButton = false }: BaseModalProps) {
  // Portal the modal to document.body to escape all container constraints
  const modalContent = (
    <>
      {/* Modal backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}
      />
      
      {/* Modal content - perfectly centered */}
      <div
        className="fixed z-[9999] bg-card border border-border/20 rounded-2xl shadow-xl overflow-hidden"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-foreground/80 hover:text-foreground transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </>
  );

  // Render to document.body to escape all container constraints
  return createPortal(modalContent, document.body);
}