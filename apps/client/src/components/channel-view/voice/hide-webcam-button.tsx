import { useRemoteWebcamVisibility } from '@/components/voice-provider/remote-webcam-visibility-context';
import { IconButton, type TIconButtonSize } from '@sharkord/ui';
import { Video, VideoOff } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type THideWebcamButtonProps = {
  userId: number;
  className?: string;
  size?: TIconButtonSize;
};

const HideWebcamButton = memo(
  ({ userId, className, size = 'sm' }: THideWebcamButtonProps) => {
    const { t } = useTranslation('sidebar');
    const { isWebcamHidden, toggleWebcamHidden } = useRemoteWebcamVisibility();
    const hidden = isWebcamHidden(userId);
    const handleToggleWebcamHidden = useCallback(() => {
      toggleWebcamHidden(userId);
    }, [toggleWebcamHidden, userId]);

    return (
      <IconButton
        icon={hidden ? Video : VideoOff}
        onClick={handleToggleWebcamHidden}
        title={t(hidden ? 'showWebcam' : 'hideWebcam')}
        variant={hidden ? 'default' : 'ghost'}
        size={size}
        className={className}
      />
    );
  }
);

HideWebcamButton.displayName = 'HideWebcamButton';

export { HideWebcamButton };
