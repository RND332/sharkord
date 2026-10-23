import { useStoreSelector, type IRootState } from '@/features/store';
import {
  customEmojiFileByNameSelector,
  customEmojisSelector
} from './selectors';

export const useCustomEmojis = () => useStoreSelector(customEmojisSelector);

export const useCustomEmojiFile = (name: string) =>
  useStoreSelector((state: IRootState) =>
    customEmojiFileByNameSelector(state, name)
  );
