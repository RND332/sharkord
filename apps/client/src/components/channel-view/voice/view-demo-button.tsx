import { useDemoVisibility } from '@/components/voice-provider/demo-visibility-context';
import { IconButton } from '@sharkord/ui';
import { Monitor, MonitorOff } from 'lucide-react';
import { memo } from 'react';

type TViewDemoButtonProps = {
  userId: number;
};

const ViewDemoButton = memo(({ userId }: TViewDemoButtonProps) => {
  const { isViewingDemo, viewDemo, stopViewingDemo } = useDemoVisibility();
  const viewing = isViewingDemo(userId);

  return (
    <IconButton
      icon={viewing ? MonitorOff : Monitor}
      onClick={() => (viewing ? stopViewingDemo(userId) : viewDemo(userId))}
      title={viewing ? 'Stop viewing demo' : 'View demo'}
      variant={viewing ? 'default' : 'ghost'}
      size="sm"
    />
  );
});

ViewDemoButton.displayName = 'ViewDemoButton';

export { ViewDemoButton };
