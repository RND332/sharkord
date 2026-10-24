import { memo } from 'react';
import { OverrideLayout } from './layout';
import { VideoPlayer } from './video-player';

type TVideoOverrideProps = {
  src: string;
};

const VideoOverride = memo(({ src }: TVideoOverrideProps) => {
  return (
    <OverrideLayout>
      <VideoPlayer url={src} className="max-h-75" />
    </OverrideLayout>
  );
});

export { VideoOverride };
