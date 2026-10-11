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
      'flex w-full items-center gap-2 rounded-lg border p-[15px] text-left text-[15px] leading-[18px] cursor-pointer',
      isActive
        ? 'border-primary bg-raised text-primary'
        : 'border-subtle-foreground bg-panel'
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
          className="flex h-[620px] max-h-[calc(100dvh-2rem)] flex-col gap-0 rounded-xl p-0"
        >
          <DialogHeader className="shrink-0 gap-[7px] border-b border-line px-[26px] pt-[25px] pb-[21px] pr-14">
            <DialogTitle className="text-[21px] leading-[26px] font-bold tracking-[-0.025em]">
              {t('createChannelTitle')}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-[19px]">
              {t('createChannelDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-[26px] py-7">
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

            <div className="flex flex-col gap-[9px]">
              <label
                htmlFor="create-channel-name"
                className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground"
              >
                {t('channelNameLabel')}
              </label>
              <AutoFocus>
                <Input
                  id="create-channel-name"
                  className="h-[50px] rounded-lg border-subtle-foreground bg-canvas px-[15px] text-[15px] leading-[18px]"
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

          <DialogFooter className="h-[74px] shrink-0 flex-row items-center justify-end gap-[10px] px-[26px] sm:mx-0 sm:mb-0">
            <Button
              className="h-10 gap-2 rounded-lg px-[14px]"
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
