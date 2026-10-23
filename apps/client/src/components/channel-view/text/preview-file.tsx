import { FullScreenImage } from '@/components/fullscreen-image/content';
import type { TDisplayItem } from '@/hooks/use-upload-files';
import { cn } from '@/lib/utils';
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
import { memo, useCallback, useMemo, useState } from 'react';
import { VideoPlayer } from './overrides/video-player';

const categoryIconMap: Record<FileCategory, React.ElementType> = {
  [FileCategory.AUDIO]: MusicalNoteIcon,
  [FileCategory.IMAGE]: PhotoIcon,
  [FileCategory.VIDEO]: FilmIcon,
  [FileCategory.DOCUMENT]: DocumentTextIcon,
  [FileCategory.OTHER]: DocumentIcon
};

type TUploadProgressBarProps = {
  progress: number;
};

const UploadProgressBar = memo(({ progress }: TUploadProgressBarProps) => (
  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
    <div
      className="h-full bg-primary transition-all duration-200"
      style={{ width: `${progress}%` }}
    />
  </div>
));

type TPreviewFileProps = {
  item: TDisplayItem;
  onRemove?: () => void;
};

const PreviewFile = memo(({ item, onRemove }: TPreviewFileProps) => {
  const { name, size, extension, previewUrl, progress } = item;

  const category = useMemo(() => getFileCategory(extension), [extension]);
  const isImage = category === FileCategory.IMAGE;
  const isVideo = category === FileCategory.VIDEO;
  const isUploading = progress !== undefined && progress < 100;

  const onRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      if (onRemove) {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      }
    },
    [onRemove]
  );

  const [previewError, setPreviewError] = useState(false);

  const onPreviewError = useCallback(() => {
    setPreviewError(true);
  }, []);

  const hasPreview = !!previewUrl && !previewError && (isImage || isVideo);
  const Icon = categoryIconMap[category] || DocumentIcon;

  return (
    <div
      data-attachment-preview
      className="group relative flex w-70 flex-col overflow-hidden rounded-lg bg-background transition-all duration-200"
    >
      <div className="relative h-40">
        {hasPreview ? (
          <>
            {isImage && (
              <FullScreenImage
                src={previewUrl}
                alt={name}
                className="h-full w-full object-cover"
                onError={onPreviewError}
              />
            )}
            {isVideo && (
              <VideoPlayer
                url={previewUrl}
                className="h-full w-full aspect-auto"
              />
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-sm font-medium text-white">
                  {progress}%
                </span>
              </div>
            )}
          </>
        ) : (
          <div
            className={cn(
              'flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/50',
              isUploading && 'opacity-60'
            )}
          >
            <Icon className="h-10 w-10 text-muted-foreground" />
            {isUploading && (
              <span className="text-xs font-medium text-muted-foreground">
                {progress}%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-3 py-2">
        <span
          className="truncate text-sm font-semibold text-foreground"
          title={name}
        >
          {name}
        </span>
        <span className="text-xs text-muted-foreground">{filesize(size)}</span>
      </div>

      {onRemove && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemoveClick}
        >
          <TrashIcon className="h-3 w-3" />
        </Button>
      )}

      {isUploading && <UploadProgressBar progress={progress} />}
    </div>
  );
});

export { PreviewFile, UploadProgressBar };
