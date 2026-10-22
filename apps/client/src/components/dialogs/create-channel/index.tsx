import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ChannelType,
  parseTrpcErrors,
  type TTrpcErrors
} from '@dodecagon/shared';
import {
  AutoFocus,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input
} from '@dodecagon/ui';
import {
  CheckIcon,
  HashtagIcon,
  PlusIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

const CHANNEL_TYPE_OPTIONS = [
  { type: ChannelType.TEXT, Icon: HashtagIcon },
  { type: ChannelType.VOICE, Icon: SpeakerWaveIcon }
] as const;

type TChannelTypeItemProps = {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  tabIndex: number;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
};

const ChannelTypeItem = ({
  icon,
  title,
  isActive,
  tabIndex,
  onClick,
  onKeyDown
}: TChannelTypeItemProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={isActive}
    tabIndex={tabIndex}
    className={cn(
      'flex w-full items-center gap-2 rounded-[8px] border p-[15px] text-left text-[15px] leading-[18px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isActive
        ? 'border-accent-text bg-raised text-accent-text'
        : 'border-control-border bg-panel'
    )}
    onClick={onClick}
    onKeyDown={onKeyDown}
  >
    {icon}
    <span>{title}</span>
    {isActive && <CheckIcon className="size-4" />}
  </button>
);

type TCreateChannelDialogProps = TDialogBaseProps & {
  categoryId: number;
  defaultChannelType?: ChannelType;
};

const CreateChannelDialog = memo(
  ({
    isOpen,
    categoryId,
    close,
    defaultChannelType = ChannelType.TEXT
  }: TCreateChannelDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [channelType, setChannelType] = useState(defaultChannelType);
    const [name, setName] = useState('New Channel');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<TTrpcErrors>({});
    const groupRef = useRef<HTMLDivElement | null>(null);

    // The radio group follows the ARIA pattern: one option is the tab stop and
    // the arrow keys move the selection and the focus together.
    const onTypeKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const lastIndex = CHANNEL_TYPE_OPTIONS.length - 1;
        let nextIndex: number;

        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            nextIndex = index === lastIndex ? 0 : index + 1;
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            nextIndex = index === 0 ? lastIndex : index - 1;
            break;
          case 'Home':
            nextIndex = 0;
            break;
          case 'End':
            nextIndex = lastIndex;
            break;
          default:
            return;
        }

        const nextOption = CHANNEL_TYPE_OPTIONS[nextIndex];

        if (!nextOption) return;

        event.preventDefault();
        setChannelType(nextOption.type);

        const options =
          groupRef.current?.querySelectorAll<HTMLButtonElement>(
            '[role="radio"]'
          );

        options?.[nextIndex]?.focus();
      },
      []
    );

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        await trpc.channels.add.mutate({
          type: channelType,
          name,
          categoryId
        });

        close();
      } catch (error) {
        setErrors(parseTrpcErrors(error));
      } finally {
        setLoading(false);
      }
    }, [name, categoryId, close, channelType]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          onInteractOutside={close}
          close={close}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0"
        >
          <DialogHeader className="shrink-0 px-6 pt-6 pb-5 pr-14">
            <DialogTitle>{t('createChannelTitle')}</DialogTitle>
            <DialogDescription>{t('createChannelDesc')}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-7 overflow-y-auto p-6">
            <div
              ref={groupRef}
              role="radiogroup"
              aria-label={t('channelTypeLabel')}
              className="flex flex-col gap-3"
            >
              <span className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground">
                {t('channelTypeLabel')}
              </span>
              {CHANNEL_TYPE_OPTIONS.map((option, index) => (
                <ChannelTypeItem
                  key={option.type}
                  title={
                    option.type === ChannelType.TEXT
                      ? t('textChannelTitle')
                      : t('voiceChannelTitle')
                  }
                  icon={<option.Icon className="size-4" />}
                  isActive={channelType === option.type}
                  tabIndex={channelType === option.type ? 0 : -1}
                  onClick={() => setChannelType(option.type)}
                  onKeyDown={(event) => onTypeKeyDown(event, index)}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="create-channel-name"
                className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground"
              >
                {t('channelNameLabel')}
              </label>
              <AutoFocus>
                <Input
                  id="create-channel-name"

                  placeholder={t('channelNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  name="name"
                  error={errors.name}
                  resetError={setErrors}
                  onEnter={onSubmit}
                />
              </AutoFocus>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-end sm:mx-0 sm:mb-0">
            <Button
              onClick={onSubmit}
              disabled={loading || !name || !channelType}
            >
              <PlusIcon className="size-5" />
              {t('createChannelBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateChannelDialog };
