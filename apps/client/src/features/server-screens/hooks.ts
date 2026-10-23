import { useStoreSelector } from '@/features/store';
import { serverScreensInfoSelector } from './selectors';

export const useServerScreenInfo = () =>
  useStoreSelector(serverScreensInfoSelector);
