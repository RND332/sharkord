import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Dialog } from '@/components/dialogs/dialogs';
import { useVoiceStats } from '@/components/voice-provider/stats-context';
import { openDialog } from '@/features/dialogs/actions';
import { useCurrentVoicePeers } from '@/features/server/hooks';
import { formatBigNumber } from '@/helpers/format-big-number';
import { cn } from '@/lib/utils';
import { NoiseSuppression } from '@/types';
import { TestId } from '@sharkord/shared';
import {
  IconButton,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { filesize } from 'filesize';
import { Stethoscope } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type StatsPopoverProps = {
  children: React.ReactNode;
};

const hardwareEncoders = [
  'external',
  'hardware',
  'nvenc',
  'vaapi',
  'videotoolbox',
  'qsv',
  'amf',
  'mediacodec'
];

const softwareEncoders = ['libvpx', 'openh264', 'libaom', 'software'];

const NOISE_SUPPRESSION_LABEL_KEYS: Record<NoiseSuppression, string> = {
  [NoiseSuppression.NONE]: 'settings:noiseSuppressionNone',
  [NoiseSuppression.STANDARD]: 'settings:noiseSuppressionStandardName',
  [NoiseSuppression.RNNOISE]: 'settings:noiseSuppressionRnnoiseName',
  [NoiseSuppression.DTLN]: 'settings:noiseSuppressionDtlnName'
};

const getCodecLabel = (codec: string) => {
  const parts = codec.split('/');

  return parts.length > 1 ? parts[1] : codec;
};

type StatsLabelValueProps = {
  text?: string;
  label?: string;
  value?: React.ReactNode;
  valueClassName?: string;
};

const StatsLabelValue = memo(
  ({ text, label, value, valueClassName }: StatsLabelValueProps) => {
    let resolvedLabel = label;
    let resolvedValue = value;

    if (text) {
      const [textLabel, ...valueParts] = text.split(':');
      const textValue = valueParts.join(':').trim();

      if (!textValue) return text;

      resolvedLabel = textLabel;
      resolvedValue = textValue;
    }

    if (!resolvedLabel || resolvedValue === undefined) return null;

    return (
      <>
        <span className="text-muted-foreground">{resolvedLabel}:</span>{' '}
        <span className={valueClassName ?? 'text-foreground'}>
          {resolvedValue}
        </span>
      </>
    );
  }
);

StatsLabelValue.displayName = 'StatsLabelValue';

const ConnectionPing = ({
  value,
  control = false
}: {
  value: number | null | undefined;
  control?: boolean;
}) => {
  const { t, i18n } = useTranslation('sidebar');
  const available =
    typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const formatted = available
    ? `${new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(value)} ms`
    : '\u2014';
  return (
    <td
      className={cn(
        'pt-1 pl-2 text-right font-semibold leading-5',
        control || !available ? 'text-muted-foreground' : 'text-primary'
      )}
      title={t(control ? 'serverPingDescription' : 'peerPingDescription')}
    >
      {formatted}
    </td>
  );
};

const StatsPopover = memo(({ children }: StatsPopoverProps) => {
  const { t } = useTranslation('sidebar');
  const transportStats = useVoiceStats();
  const peers = useCurrentVoicePeers();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverAnchor = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          const trigger = triggerRef.current;
          const dock = trigger?.closest('[data-voice-dock]');
          const reference =
            dock?.getBoundingClientRect() ??
            trigger?.getBoundingClientRect() ??
            new DOMRect();
          const sidebar =
            trigger
              ?.closest(`[data-testid="${TestId.LEFT_SIDEBAR}"]`)
              ?.getBoundingClientRect() ?? reference;
          return new DOMRect(
            sidebar.left + 8,
            reference.top,
            Math.max(0, sidebar.width - 16),
            reference.height
          );
        },
        get contextElement() {
          return triggerRef.current?.closest('[data-voice-dock]') ?? undefined;
        }
      }
    }),
    []
  );
  const { devices } = useDevices();
  const [isOpen, setIsOpen] = useState(false);
  const [showSimulcastLayers, setShowSimulcastLayers] = useState(false);

  const {
    peerRtts,
    serverRtt,
    direct,
    producer,
    consumer,
    screenShare,
    totalBytesSent,
    totalBytesReceived,
    currentBitrateSent,
    currentBitrateReceived
  } = transportStats;

  const encoder = useMemo(() => {
    if (!screenShare?.encoderImplementation) return null;

    const lowerImpl = screenShare?.encoderImplementation.toLowerCase();

    if (hardwareEncoders.some((hw) => lowerImpl.includes(hw))) {
      return {
        label: t('gpuEncoder', { encoder: screenShare.encoderImplementation }),
        isHardware: true
      };
    }

    if (softwareEncoders.some((sw) => lowerImpl.includes(sw))) {
      return {
        label: t('cpuEncoder', { encoder: screenShare.encoderImplementation }),
        isHardware: false
      };
    }

    return {
      label: t('unknownEncoder', {
        encoder: screenShare.encoderImplementation
      }),
      isHardware: null
    };
  }, [screenShare?.encoderImplementation, t]);

  const hasNoiseSuppression =
    devices.noiseSuppression !== NoiseSuppression.NONE;

  const noiseSuppressionLabel = t(
    NOISE_SUPPRESSION_LABEL_KEYS[devices.noiseSuppression]
  );

  const codec = useMemo(() => {
    return screenShare?.codec ? getCodecLabel(screenShare.codec) : undefined;
  }, [screenShare?.codec]);

  const handleOpenDiagnostics = useCallback(() => {
    setIsOpen(false);
    openDialog(Dialog.VOICE_DEBUG);
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild ref={triggerRef}>
        {children}
      </PopoverTrigger>
      {/* Register the custom anchor after Trigger so its initial anchor cannot replace it. */}
      <PopoverAnchor virtualRef={popoverAnchor} />
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-(--radix-popover-trigger-width) max-h-(--radix-popover-content-available-height) overflow-y-auto rounded-xl border border-line bg-nav p-3"
      >
        <div className="flex flex-col gap-2.5 text-xs leading-4">
          <div className="flex h-6 items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">
              {t('transportStats')}
            </h3>
            <IconButton
              className="ml-auto size-6 p-[3px]"
              variant="ghost"
              size="sm"
              icon={Stethoscope}
              title={t('voiceDiagnostics')}
              aria-label={t('voiceDiagnostics')}
              onClick={handleOpenDiagnostics}
            />
          </div>
          <table
            className="w-full table-fixed border-collapse text-xs"
            aria-label={t('connection')}
          >
            <colgroup>
              <col />
              <col className="w-[68px]" />
            </colgroup>
            <thead>
              <tr className="h-[18px] text-muted-foreground">
                <th scope="col" className="text-left font-medium">
                  {t('connection')}
                </th>
                <th scope="col" className="pl-2 text-right font-medium">
                  {t('ping')}
                </th>
              </tr>
            </thead>
            <tbody>
              {peers.map((peer) => (
                <tr key={peer.id}>
                  <td className="pt-1 leading-5">
                    <span className="block truncate" title={peer.name}>
                      {peer.name}
                    </span>
                  </td>
                  <ConnectionPing value={peerRtts[peer.id]} />
                </tr>
              ))}
              <tr>
                <td className="pt-1 leading-5">
                  <span className="block truncate" title={t('serverControl')}>
                    {t('serverControl')}
                  </span>
                </td>
                <ConnectionPing value={serverRtt} control />
              </tr>
            </tbody>
          </table>
          <div className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] gap-x-1.5 gap-y-1 pt-2 leading-[18px]">
            <span />
            <span className="font-semibold text-success">{t('outgoing')}</span>
            <span className="font-semibold text-primary">{t('incoming')}</span>
            <span className="text-muted-foreground">{t('rateLabel')}</span>
            <span>
              {producer || direct
                ? `${filesize(currentBitrateSent)}/s`
                : '\u2014'}
            </span>
            <span>
              {consumer || direct
                ? `${filesize(currentBitrateReceived)}/s`
                : '\u2014'}
            </span>
            <span className="text-muted-foreground">{t('packetsLabel')}</span>
            <span>
              {producer || direct
                ? formatBigNumber(
                    (producer?.packetsSent ?? 0) + (direct?.packetsSent ?? 0)
                  )
                : '\u2014'}
            </span>
            <span>
              {consumer || direct
                ? formatBigNumber(
                    (consumer?.packetsReceived ?? 0) +
                      (direct?.packetsReceived ?? 0)
                  )
                : '\u2014'}
            </span>
            <span className="text-muted-foreground">{t('lostLabel')}</span>
            <span className="text-muted-foreground">{'\u2014'}</span>
            <span className="text-destructive">
              {consumer || direct
                ? formatBigNumber(
                    (consumer?.packetsLost ?? 0) + (direct?.packetsLost ?? 0)
                  )
                : '\u2014'}
            </span>
          </div>

          {hasNoiseSuppression && (
            <div className="pt-2">
              <h4 className="mb-1.5 text-[13px] font-semibold leading-5 text-foreground">
                {t('microphone')}
              </h4>
              <div className="leading-[18px]">
                <StatsLabelValue
                  label={t('noiseSuppression')}
                  value={noiseSuppressionLabel}
                />
              </div>
            </div>
          )}

          {screenShare && (
            <div className="pt-2">
              <h4 className="font-medium text-blue-400 mb-1">
                {t('screenShare')}
              </h4>
              <div className="space-y-1">
                {screenShare.codec && (
                  <div>
                    <StatsLabelValue text={t('codec', { codec })} />
                  </div>
                )}
                {encoder && (
                  <div>
                    <StatsLabelValue
                      label={t('encoder').replace(/:$/, '')}
                      value={encoder.label}
                      valueClassName={
                        encoder.isHardware === true
                          ? 'text-green-400'
                          : encoder.isHardware === false
                            ? 'text-yellow-400'
                            : undefined
                      }
                    />
                  </div>
                )}
                <div>
                  <StatsLabelValue
                    text={t('resolution', {
                      width: screenShare.width,
                      height: screenShare.height
                    })}
                  />
                </div>
                <div>
                  <StatsLabelValue
                    text={t('frameRate', {
                      fps: Math.round(screenShare.frameRate)
                    })}
                  />
                </div>
                <div>
                  <StatsLabelValue
                    text={t('bitrate', {
                      bitrate: filesize(screenShare.bitrate)
                    })}
                  />
                </div>
                {screenShare.simulcast && screenShare.layers.length > 1 && (
                  <div>
                    <button
                      className="text-left hover:underline"
                      type="button"
                      onClick={() => setShowSimulcastLayers((show) => !show)}
                    >
                      <StatsLabelValue
                        text={t('simulcastLayers', {
                          count: screenShare.layers.length
                        })}
                      />
                    </button>
                    {showSimulcastLayers && (
                      <div className="mt-2 space-y-2">
                        {screenShare.layers.map((layer, index) => (
                          <div
                            key={layer.id}
                            className="space-y-1 rounded-md border border-border/50 p-2"
                          >
                            <div className="pb-1 font-medium text-foreground">
                              {t('simulcastLayer', {
                                layer: layer.rid || index + 1
                              })}
                              {layer.codec &&
                                ` (${getCodecLabel(layer.codec)})`}
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('resolution', {
                                  width: layer.width,
                                  height: layer.height
                                })}
                              />
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('frameRate', {
                                  fps: Math.round(layer.frameRate)
                                })}
                              />
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('bitrate', {
                                  bitrate: filesize(layer.bitrate)
                                })}
                              />
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('packets', {
                                  packets: formatBigNumber(layer.packetsSent)
                                })}
                              />
                            </div>
                            {layer.qualityLimitationReason !== 'none' && (
                              <div>
                                <StatsLabelValue
                                  text={t('qualityLimited', {
                                    reason: layer.qualityLimitationReason
                                  })}
                                  valueClassName="text-yellow-400"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <StatsLabelValue
                    text={t('framesEncoded', {
                      frames: formatBigNumber(screenShare.framesEncoded)
                    })}
                  />
                </div>
                {screenShare.qualityLimitationReason !== 'none' && (
                  <div>
                    <StatsLabelValue
                      text={t('qualityLimited', {
                        reason: screenShare.qualityLimitationReason
                      })}
                      valueClassName="text-yellow-400"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <h4 className="mb-1.5 text-[13px] font-semibold leading-5 text-foreground">
              {t('sessionTotals')}
            </h4>
            <div className="grid grid-cols-2 gap-3 leading-[18px] text-foreground">
              <div className="flex gap-1.5">
                <span className="text-muted-foreground">↑</span>
                {filesize(totalBytesSent)}
              </div>
              <div className="flex gap-1.5">
                <span className="text-muted-foreground">↓</span>
                {filesize(totalBytesReceived)}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export { StatsPopover };
