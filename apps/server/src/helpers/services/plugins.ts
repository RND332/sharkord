import { getSettings } from '../../db/queries/server';
import { pluginManager } from '../../plugins';

const listPluginComponentIdsService = async (): Promise<string[]> => {
  const { enablePlugins } = await getSettings();

  if (!enablePlugins) {
    return [];
  }

  return pluginManager.getPluginIdsWithComponents();
};

export { listPluginComponentIdsService };
