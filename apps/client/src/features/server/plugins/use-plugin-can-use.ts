import { useStoreSelector } from '@/features/store';
import { Permission, type PluginCapabilityType } from '@dodecagon/shared';
import type { IRootState } from '../../store';
import { useCan } from '../hooks';
import { canUsePluginCapabilitySelector } from '../selectors';
import { usePluginId } from './plugin-id-context';

const usePluginCanUse = (type: PluginCapabilityType, name: string) => {
  const pluginId = usePluginId();
  const can = useCan();

  const canUseCapability = useStoreSelector((state: IRootState) =>
    canUsePluginCapabilitySelector(state, pluginId ?? '', type, name)
  );

  return can(Permission.USE_PLUGINS) && canUseCapability;
};

export { usePluginCanUse };
