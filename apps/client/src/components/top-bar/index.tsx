import { LanguageSwitcher } from '@/components/language-switcher';
import { usePublicServerSettings } from '@/features/server/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { PluginSlot } from '@sharkord/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@sharkord/ui';
import { memo } from 'react';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { ServerSearch } from './server-search';

const TopBar = memo(() => {
  const settings = usePublicServerSettings();
  const serverName = settings?.name;
  const trimmedServerName = serverName?.trim();
  const serverInitial = trimmedServerName?.[0]?.toUpperCase() || 'S';

  return (
    <header className="hidden h-10 w-full shrink-0 grid-cols-[minmax(0,1fr)_minmax(180px,550px)_minmax(0,1fr)] items-center gap-5 border-b border-line bg-rail px-5 lg:grid">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar className="size-6 rounded-lg" aria-hidden="true">
          <AvatarImage
            src={getFileUrl(settings?.logo)}
            alt=""
            className="object-cover"
          />
          <AvatarFallback className="rounded-lg bg-sidebar-primary text-[15px] font-semibold text-sidebar-primary-foreground">
            {serverInitial}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-bold tracking-[-0.01em] text-foreground">
          {serverName}
        </span>
      </div>

      <div className="flex items-center justify-center">
        {settings?.enableSearch && <ServerSearch />}
      </div>

      <div className="flex min-w-0 items-center justify-end">
        <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
        <LanguageSwitcher
          variant="full"
          className="h-8 w-auto border-0 bg-transparent text-muted-foreground"
        />
      </div>
    </header>
  );
});

export { TopBar };
