import { useCan } from '@/features/server/hooks';
import { loadPluginTabs } from '@/features/server/plugins/actions';
import {
  usePluginCommands,
  usePluginTabs
} from '@/features/server/plugins/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  Permission,
  type TPluginInfo,
  type TPluginSettingDefinition
} from '@dodecagon/shared';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  LoadingCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@dodecagon/ui';
import { CubeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ImageWithFallback } from '../plugins/marketplace/image-with-fallback';
import { PluginCommands } from './commands';
import {
  getDefaultPluginTab,
  getPluginStatus,
  getPluginTabs,
  PLUGIN_STATUS_CLASSES,
  PLUGIN_STATUS_LABEL_KEYS
} from './helpers';
import { PluginLogs } from './logs';
import { PluginPermissions } from './permissions';
import { PluginSettings } from './settings';
import { PluginTabContent } from './tab-content';

const usePluginSettings = (pluginId: string) => {
  const { t } = useTranslation('settings');
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<TPluginSettingDefinition[]>(
    []
  );
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [secretsSet, setSecretsSet] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);

      const trpc = getTRPCClient();

      try {
        const result = await trpc.plugins.getSettings.query({ pluginId });

        setDefinitions(result.definitions);
        setValues(result.values);
        setSecretsSet(result.secretsSet);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedLoadPluginSettings')));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [pluginId, t]);

  return { definitions, values, secretsSet, loading };
};

type TPluginViewProps = {
  plugin: TPluginInfo;
};

const PluginView = memo(({ plugin }: TPluginViewProps) => {
  const { t } = useTranslation('settings');
  const customTabs = usePluginTabs(plugin.id);
  const can = useCan();
  const canManagePluginPermissions = can(Permission.MANAGE_PLUGIN_PERMISSIONS);

  useEffect(() => {
    loadPluginTabs(plugin.id);
  }, [plugin.id]);
  const { definitions, values, secretsSet, loading } = usePluginSettings(
    plugin.id
  );
  const commandsMap = usePluginCommands();

  const hasCommands = (commandsMap[plugin.id] ?? []).length > 0;
  const hasSettings = definitions.length > 0;

  const status = getPluginStatus(plugin);

  const tabs = useMemo(
    () =>
      getPluginTabs({
        hasSettings,
        hasCommands,
        canManagePermissions: canManagePluginPermissions,
        customTabs,
        labels: {
          settings: t('pluginSettingsTab'),
          commands: t('pluginCommandsTab'),
          logs: t('pluginLogsTab'),
          permissions: t('pluginPermissionsTab')
        }
      }),
    [hasSettings, hasCommands, canManagePluginPermissions, customTabs, t]
  );

  const defaultTab = getDefaultPluginTab({ hasSettings, hasCommands });

  const identity = (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full max-w-[880px] flex-col gap-[15px] border-b border-line pb-[14px] sm:flex-row sm:items-center">
        <div className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-raised">
          <ImageWithFallback
            src={plugin.logo}
            alt=""
            className="size-full object-cover"
            iconFallback={<CubeIcon className="size-6 text-muted-foreground" />}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <h2 className="truncate text-[24px] font-bold leading-[29px] text-foreground">
            {plugin.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 text-sm leading-[18px] text-muted-foreground">
            <span className="truncate">{plugin.description}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">v{plugin.version}</span>
            <span aria-hidden="true">·</span>
            <span className={PLUGIN_STATUS_CLASSES[status]}>
              {t(PLUGIN_STATUS_LABEL_KEYS[status])}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm leading-[18px] text-muted-foreground">
          <span className="truncate">{plugin.author}</span>
          {plugin.homepage && (
            <a
              href={plugin.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-accent-text underline transition-colors hover:text-foreground"
            >
              {plugin.homepage}
            </a>
          )}
        </div>
      </div>

      {plugin.loadError && (
        <div className="w-full max-w-[880px]">
          <Alert variant="destructive">
            <ExclamationCircleIcon className="h-4 w-4" />
            <AlertTitle>{t('pluginLoadErrorTitle')}</AlertTitle>
            <AlertDescription>{plugin.loadError}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <>
        {identity}
        <LoadingCard className="h-64" />
      </>
    );
  }

  // a plugin that only produces logs gets no sub navigation at all
  if (
    !hasSettings &&
    !hasCommands &&
    !canManagePluginPermissions &&
    customTabs.length === 0
  ) {
    return (
      <>
        {identity}
        <PluginLogs pluginId={plugin.id} />
      </>
    );
  }

  return (
    <>
      {identity}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4 w-full max-w-[880px]">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              data-tab={tab.id}
              className="data-[state=active]:font-semibold"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {hasSettings && (
          <TabsContent value="settings" className="space-y-6">
            <PluginSettings
              pluginId={plugin.id}
              definitions={definitions}
              values={values}
              secretsSet={secretsSet}
            />
          </TabsContent>
        )}

        {hasCommands && (
          <TabsContent value="commands" className="space-y-6">
            <PluginCommands pluginId={plugin.id} />
          </TabsContent>
        )}

        <TabsContent value="logs" className="space-y-6">
          <PluginLogs pluginId={plugin.id} />
        </TabsContent>

        {canManagePluginPermissions && (
          <TabsContent value="permissions" className="space-y-6">
            <PluginPermissions pluginId={plugin.id} />
          </TabsContent>
        )}

        {customTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <PluginTabContent pluginId={plugin.id} tab={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
});

export { PluginView };
