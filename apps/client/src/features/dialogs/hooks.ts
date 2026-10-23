import { useStoreSelector } from '@/features/store';
import { dialogInfoSelector } from './selectors';

export const useDialogInfo = () => useStoreSelector(dialogInfoSelector);
