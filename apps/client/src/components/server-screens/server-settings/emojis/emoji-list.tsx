import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import type { TJoinedEmoji } from '@dodecagon/shared';
import { Input } from '@dodecagon/ui';
import { MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline';
import { filesize } from 'filesize';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EMOJI_COLUMN_LABEL_KEYS,
  EMOJI_COLUMN_ORDER,
  EMOJI_COLUMN_WIDTHS
} from './helpers';

type TEmojiListProps = {
  emojis: TJoinedEmoji[];
  setSelectedEmojiId: (id: number) => void;
  selectedEmojiId: number | undefined;
};

type TEmojiRowProps = {
  emoji: TJoinedEmoji;
  isSelected: boolean;
  onSelect: (emojiId: number) => void;
};

const EmojiRow = memo(({ emoji, isSelected, onSelect }: TEmojiRowProps) => {
  const { t } = useTranslation('settings');
  const handleEdit = useCallback(
    () => onSelect(emoji.id),
    [onSelect, emoji.id]
  );

  return (
    <div
      className={cn(
        'flex items-center border-b border-line py-3 last:border-b-0',
        isSelected && 'bg-raised'
      )}
    >
      <div className={cn(EMOJI_COLUMN_WIDTHS.icon, 'flex items-center')}>
        <img
          src={getFileUrl(emoji.file)}
          alt=""
          className="size-6 rounded-[4px] object-contain"
        />
      </div>
      <span
        className={cn(
          EMOJI_COLUMN_WIDTHS.name,
          'truncate text-sm leading-[18px] text-foreground'
        )}
        title={emoji.name}
      >
        {emoji.name}
      </span>
      <span
        className={cn(
          EMOJI_COLUMN_WIDTHS.size,
          'text-sm leading-[18px] text-muted-foreground'
        )}
      >
        {filesize(emoji.file.size, { standard: 'jedec' })}
      </span>
      <div className={cn(EMOJI_COLUMN_WIDTHS.actions, 'flex items-center')}>
        <button
          type="button"
          onClick={handleEdit}
          aria-label={t('editEmojiActionLabel', { name: emoji.name })}
          className="flex size-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-panel hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <PencilIcon className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
});

const EmojiList = memo(
  ({ emojis, setSelectedEmojiId, selectedEmojiId }: TEmojiListProps) => {
    const { t } = useTranslation('settings');
    const [search, setSearch] = useState('');

    const onSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
      []
    );

    const filteredEmojis = useMemo(() => {
      const sorted = [...emojis].sort((a, b) => b.createdAt - a.createdAt);

      if (!search) return sorted;

      return sorted.filter((emoji) =>
        emoji.name.toLowerCase().includes(search.toLowerCase())
      );
    }, [emojis, search]);

    let emptyLabel = t('noCustomEmojisYet');

    if (search) {
      emptyLabel = t('noEmojisFound');
    }

    return (
      <div className="flex w-full flex-col gap-4">
        <div className="relative max-w-[280px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchEmojisPlaceholder')}
            value={search}
            onChange={onSearchChange}
            className="h-10 pl-9"
          />
        </div>

        <div className="flex w-full flex-col">
          <div className="flex items-center border-b border-line py-3">
            {EMOJI_COLUMN_ORDER.map((id) => (
              <span
                key={id}
                className={cn(
                  EMOJI_COLUMN_WIDTHS[id],
                  'text-xs uppercase leading-4 tracking-[0.07em] text-subtle-foreground'
                )}
              >
                {t(EMOJI_COLUMN_LABEL_KEYS[id])}
              </span>
            ))}
          </div>

          {filteredEmojis.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            filteredEmojis.map((emoji) => (
              <EmojiRow
                key={emoji.id}
                emoji={emoji}
                isSelected={selectedEmojiId === emoji.id}
                onSelect={setSelectedEmojiId}
              />
            ))
          )}
        </div>
      </div>
    );
  }
);

export { EmojiList };
