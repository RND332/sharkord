import { useStoreSelector, type IRootState } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { isDebug } from '@/helpers/is-debug';

const StoreDebug = () => {
  const server = useStoreSelector((state: IRootState) => state.server);

  // the server renders the app too and the debug flag lives in the browser
  if (!isDebug()) {
    return null;
  }

  logDebug('Server State', server);

  return null;
};

export { StoreDebug };
