import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { usePluginsEnabled } from '@/features/server/hooks';
import type { TPluginInfo } from '@dodecagon/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@dodecagon/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InstalledPlugins } from './installed';
import { Marketplace } from './marketplace';

type TPluginsProps = {
  plugins: TPluginInfo[];
  loading: boolean;
  refetch: () => Promise<void>;
};

const Plugins = memo(({ plugins, loading, refetch }: TPluginsProps) => {
  const { t } = useTranslation('settings');
  const pluginsEnabled = usePluginsEnabled();

  return (
    <SettingsSection
      title={t('pluginsTitle')}
      description={t('pluginsManageDesc')}
    >
      <Tabs defaultValue="installed" className="w-full">
        <TabsList className="flex h-auto w-full items-center justify-start gap-6 rounded-none border-b border-line bg-transparent p-0">
          <TabsTrigger
            value="installed"
            disabled={!pluginsEnabled}
            className="rounded-none border-b-2 border-transparent px-0 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-foreground"
          >
            {t('installedTab')}
          </TabsTrigger>
          <TabsTrigger
            value="marketplace"
            disabled={!pluginsEnabled}
            className="rounded-none border-b-2 border-transparent px-0 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-foreground"
          >
            {t('marketplaceTab')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="installed" className="mt-[21px]">
          <InstalledPlugins
            plugins={plugins}
            loading={loading}
            refetch={refetch}
          />
        </TabsContent>
        <TabsContent value="marketplace" className="mt-[21px]">
          <Marketplace plugins={plugins} refetchInstalled={refetch} />
        </TabsContent>
      </Tabs>
    </SettingsSection>
  );
});

export { Plugins };
