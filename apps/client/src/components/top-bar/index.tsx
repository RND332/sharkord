import { LanguageSwitcher } from '@/components/language-switcher';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { PluginSlot } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { ServerSearch } from './server-search';
import { VoiceButtons } from './voice-buttons';

type TTopBarProps = {
  onToggleRightSidebar: () => void;
  isOpen: boolean;
};

const TopBar = memo(({ onToggleRightSidebar, isOpen }: TTopBarProps) => {
  const { t } = useTranslation('topbar');
  const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const settings = usePublicServerSettings();

  return (
    <header className="hidden h-16 w-full shrink-0 grid-cols-[minmax(160px,1fr)_minmax(180px,550px)_max-content] items-center gap-5 border-b border-line bg-rail px-5 lg:grid">
      <div className="flex min-w-0 items-center gap-2.5">
        <img src="/logo.webp" alt="" className="size-8 object-contain" />
        <span className="text-lg font-bold tracking-tight text-foreground">
          sharkord
        </span>
      </div>

      <div className="flex items-center justify-center">
        {settings?.enableSearch && <ServerSearch />}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
        {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
          <VoiceButtons currentVoiceChannelId={currentVoiceChannelId} />
        )}
        <LanguageSwitcher
          variant="full"
          className="h-8 w-auto border-0 bg-transparent text-muted-foreground"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleRightSidebar}
          aria-label={
            isOpen ? t('closeMembersSidebar') : t('openMembersSidebar')
          }
        >
          {isOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRight className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
});

export { TopBar };
