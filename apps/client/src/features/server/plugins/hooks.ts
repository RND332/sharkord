import { useStoreSelector, type IRootState } from '@/features/store';
import type { PluginSlot } from '@dodecagon/shared';
import {
  commandsSelector,
  flatCommandsSelector,
  fullscreenPluginIdsSelector,
  pluginComponentsBySlotSelector,
  pluginMetadataByIdSelector,
  pluginNamesSelector,
  pluginSlotIdsSelector,
  pluginTabsByIdSelector
} from './selectors';

export const usePluginCommands = () => useStoreSelector(commandsSelector);

export const useFlatPluginCommands = () =>
  useStoreSelector(flatCommandsSelector);

export const usePluginComponentsBySlot = (slotId: PluginSlot) =>
  useStoreSelector((state: IRootState) =>
    pluginComponentsBySlotSelector(state, slotId)
  );

export const usePluginNames = () => useStoreSelector(pluginNamesSelector);

export const usePluginMetadata = (pluginId: string | null | undefined) =>
  useStoreSelector((state: IRootState) =>
    pluginId ? pluginMetadataByIdSelector(state, pluginId) : undefined
  );

export const usePluginSlotIds = (pluginId: string) =>
  useStoreSelector((state: IRootState) =>
    pluginSlotIdsSelector(state, pluginId)
  );

export const usePluginTabs = (pluginId: string) =>
  useStoreSelector((state: IRootState) =>
    pluginTabsByIdSelector(state, pluginId)
  );

export const useFullscreenPluginIds = () =>
  useStoreSelector(fullscreenPluginIdsSelector);
