import { useRemoteWebcamVisibility } from '@/components/voice-provider/remote-webcam-visibility-context';
import { IconButton } from '@sharkord/ui';
import { Video, VideoOff } from 'lucide-react';
import { memo } from 'react';

type THideWebcamButtonProps = {
  userId: number;
};

const HideWebcamButton = memo(({ userId }: THideWebcamButtonProps) => {
  const { isWebcamHidden, toggleWebcamHidden } = useRemoteWebcamVisibility();
  const hidden = isWebcamHidden(userId);

  return (
    <IconButton
      icon={hidden ? Video : VideoOff}
      onClick={() => toggleWebcamHidden(userId)}
      title={hidden ? 'Show webcam' : 'Hide webcam'}
      variant={hidden ? 'default' : 'ghost'}
      size="sm"
    />
  );
});

HideWebcamButton.displayName = 'HideWebcamButton';

export { HideWebcamButton };
