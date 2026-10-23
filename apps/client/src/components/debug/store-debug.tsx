import { useStoreSelector, type IRootState } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';

const StoreDebug = () => {
  const server = useStoreSelector((state: IRootState) => state.server);

  logDebug('Server State', server);

  return null;
};

export { StoreDebug };
