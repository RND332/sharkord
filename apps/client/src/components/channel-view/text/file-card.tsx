import { FileCategory, getFileCategory } from '@dodecagon/shared';
import { Button } from '@dodecagon/ui';
import {
  DocumentIcon,
  DocumentTextIcon,
  FilmIcon,
  MusicalNoteIcon,
  PhotoIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { filesize } from 'filesize';
import { memo, useCallback, useMemo } from 'react';

type TFileIconProps = {
  extension: string;
};

const categoryMap: Record<FileCategory, React.ElementType> = {
  [FileCategory.AUDIO]: MusicalNoteIcon,
  [FileCategory.IMAGE]: PhotoIcon,
  [FileCategory.VIDEO]: FilmIcon,
  [FileCategory.DOCUMENT]: DocumentTextIcon,
  [FileCategory.OTHER]: DocumentIcon
};

const FileIcon = memo(({ extension }: TFileIconProps) => {
  const category = useMemo(() => getFileCategory(extension), [extension]);
  const className = 'size-[18px] text-foreground';

  const Icon = categoryMap[category] || DocumentIcon;

  return <Icon className={className} />;
});

type TFileCardProps = {
  name: string;
  size: number;
  extension: string;
  href?: string;
  onRemove?: () => void;
};

const FileCard = ({
  name,
  size,
  extension,
  href,
  onRemove
}: TFileCardProps) => {
  const onRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      if (onRemove) {
        e.preventDefault();
        onRemove();
      }
    },
    [onRemove]
  );

  return (
    <a
      className="flex h-16 w-[400px] max-w-full items-center gap-3 rounded-[8px] border border-line bg-panel px-[14px] select-none transition-colors duration-200 hover:bg-raised"
      href={href}
      target="_blank"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-raised">
        <FileIcon extension={extension} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate text-[13px] font-medium leading-[18px] text-foreground">
          {name}
        </span>
        <span className="text-[11px] leading-4 text-subtle-foreground">
          {filesize(size)}
        </span>
      </div>
      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0 rounded-[6px] bg-raised transition-opacity duration-200"
          onClick={onRemoveClick}
        >
          <TrashIcon className="size-4" />
        </Button>
      )}
    </a>
  );
};

export { FileCard };
