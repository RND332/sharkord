import { memo } from 'react';
import { AudioPlayer } from './audio-player';
import { OverrideLayout } from './layout';

type TAudioOverrideProps = {
  src: string;
};

const AudioOverride = memo(({ src }: TAudioOverrideProps) => {
  return (
    <OverrideLayout>
      <AudioPlayer url={src} />
    </OverrideLayout>
  );
});

export { AudioOverride };
