import Lottie from 'lottie-react';
import turboLoading from '../../animations/lottie-turbo.json';
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
          <Lottie
            animationData={turboLoading}
            loop={true}
            style={{ width: 72, height: 72 }}
          />
        </div>
        <div className="text-fg-muted text-sm text-center">{message}</div>
      </div>
    </BaseModal>
  );
}