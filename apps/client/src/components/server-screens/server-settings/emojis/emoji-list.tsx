import { getFileUrl } from '@/helpers/get-file-url';
import type { TJoinedEmoji } from '@sharkord/shared';
import { Input } from '@sharkord/ui';
import { filesize } from 'filesize';
import { Pencil, Search } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const handleEdit = useCallback(
    () => onSelect(emoji.id),
    [onSelect, emoji.id]
  );

  return (
    <div
      className={
        isSelected
          ? 'flex items-center border-b border-line bg-raised py-3'
          : 'flex items-center border-b border-line py-3'
      }
    >
      <div className="flex w-[54px] shrink-0 items-center">
        <img
          src={getFileUrl(emoji.file)}
          alt=""
          className="size-6 rounded-[4px] object-contain"
        />
      </div>
      <span className="min-w-0 grow truncate text-sm leading-[18px] text-foreground">
        {emoji.name}
      </span>
      <span className="w-[100px] shrink-0 text-sm leading-[18px] text-muted-foreground">
        {filesize(emoji.file.size, { standard: 'jedec' })}
      </span>
      <div className="flex w-[70px] shrink-0 items-center justify-end">
        <button
          type="button"
          onClick={handleEdit}
          aria-label={`Edit ${emoji.name}`}
          className="flex size-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-panel hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Pencil className="size-4" strokeWidth={1.5} />
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
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchEmojisPlaceholder')}
            value={search}
            onChange={onSearchChange}
            className="h-10 pl-9"
          />
        </div>

        <div className="flex w-full flex-col">
          <div className="flex items-center border-b border-line py-3">
            <span className="w-[54px] shrink-0 text-xs uppercase leading-4 tracking-[0.07em] text-subtle-foreground">
              {t('emojisIconColumn')}
            </span>
            <span className="grow text-xs uppercase leading-4 tracking-[0.07em] text-subtle-foreground">
              {t('emojisNameColumn')}
            </span>
            <span className="w-[100px] shrink-0 text-xs uppercase leading-4 tracking-[0.07em] text-subtle-foreground">
              {t('emojisSizeColumn')}
            </span>
            <span className="w-[70px] shrink-0 text-xs uppercase leading-4 tracking-[0.07em] text-subtle-foreground">
              {t('emojisActionsColumn')}
            </span>
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
