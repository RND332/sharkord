import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { useDemoVisibility } from '@/components/voice-provider/demo-visibility-context';
import { IconButton, type TIconButtonSize } from '@sharkord/ui';
import { Monitor, MonitorOff } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TViewDemoButtonProps = {
  userId: number;
  className?: string;
  size?: TIconButtonSize;
};

const ViewDemoButton = memo(
  ({ userId, className, size = 'sm' }: TViewDemoButtonProps) => {
    const { t } = useTranslation('sidebar');
    const { devices } = useDevices();
    const { isViewingDemo, viewDemo, stopViewingDemo } = useDemoVisibility();
    const viewing = isViewingDemo(userId);
    const handleToggleDemo = useCallback(() => {
      if (viewing) {
        stopViewingDemo(userId);
      } else if (!devices.voiceOnlyMode) {
        viewDemo(userId);
      }
    }, [viewing, stopViewingDemo, viewDemo, userId, devices.voiceOnlyMode]);

    return (
      <IconButton
        icon={viewing ? MonitorOff : Monitor}
        onClick={handleToggleDemo}
        title={t(viewing ? 'stopViewingDemo' : 'viewDemo')}
        variant={viewing ? 'default' : 'ghost'}
        size={size}
        className={className}
        disabled={devices.voiceOnlyMode && !viewing}
      />
    );
  }
);

ViewDemoButton.displayName = 'ViewDemoButton';

export { ViewDemoButton };
