import BaseModal from './BaseModal';

interface BlockingMessageModalProps {
  message: string;
  onClose: () => void;
}

export default function BlockingMessageModal({ message, onClose }: BlockingMessageModalProps) {
  return (
    <BaseModal onClose={onClose} showCloseButton={false}>
      <div className="flex w-[24.5rem] flex-col items-center justify-center p-8">
        <div className="flex size-[4.5rem] items-center justify-center pb-4">
          <img
            src="/brand/ario-token-logo.svg"
            alt="Loading"
            className="w-16 h-16 animate-spin"
            style={{ animationDuration: '2s' }}
          />
        </div>
        <div className="text-foreground text-sm text-center">{message}</div>
      </div>
    </BaseModal>
  );
}