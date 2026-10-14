import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ChannelType,
  parseTrpcErrors,
  type TTrpcErrors
} from '@sharkord/shared';
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
} from '@sharkord/ui';
import { Check, Hash, Plus, Volume2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TChannelTypeItemProps = {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  onClick: () => void;
};

const ChannelTypeItem = ({
  icon,
  title,
  isActive,
  onClick
}: TChannelTypeItemProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={isActive}
    className={cn(
      'flex h-11 w-full items-center gap-2 rounded-md border px-3 text-left text-sm leading-5 cursor-pointer',
      isActive
        ? 'border-accent-text bg-raised text-accent-text'
        : 'border-control-border bg-panel'
    )}
    onClick={onClick}
  >
    {icon}
    <span>{title}</span>
    {isActive && <Check className="size-4" />}
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
          <DialogHeader className="shrink-0 border-b border-line p-6 pr-14">
            <DialogTitle>{t('createChannelTitle')}</DialogTitle>
            <DialogDescription>{t('createChannelDesc')}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-6">
            <div
              role="radiogroup"
              aria-label={t('channelTypeLabel')}
              className="flex flex-col gap-3"
            >
              <span className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground">
                {t('channelTypeLabel')}
              </span>
              <ChannelTypeItem
                title={t('textChannelTitle')}
                icon={<Hash className="size-4" />}
                isActive={channelType === ChannelType.TEXT}
                onClick={() => setChannelType(ChannelType.TEXT)}
              />

              <ChannelTypeItem
                title={t('voiceChannelTitle')}
                icon={<Volume2 className="size-4" />}
                isActive={channelType === ChannelType.VOICE}
                onClick={() => setChannelType(ChannelType.VOICE)}
              />
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
              <Plus className="size-5" />
              {t('createChannelBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateChannelDialog };
