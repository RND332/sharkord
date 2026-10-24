import { FullScreenImage } from '@/components/fullscreen-image/content';
import { memo, useCallback, useState } from 'react';
import { OverrideLayout } from './layout';

type TImageOverrideProps = {
  src: string;
  alt?: string;
  title?: string;
};

const ImageOverride = memo(({ src, alt }: TImageOverrideProps) => {
  const [error, setError] = useState(false);

  const onLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      // @ts-expect-error - green what is your problem green what is your problem me say alone ramp
      event.target.style.opacity = 1;
    },
    []
  );

  const onError = useCallback(() => {
    setError(true);
  }, []);

  if (error) return null;

  return (
    <OverrideLayout>
      <div className="w-fit max-w-[400px] overflow-hidden rounded-[8px] border border-line bg-rail">
        <FullScreenImage
          src={src}
          alt={alt}
          onLoad={onLoad}
          onError={onError}
          className="max-h-[300px] max-w-full object-contain"
          style={{ opacity: 0 }}
          crossOrigin="anonymous"
        />
      </div>
    </OverrideLayout>
  );
});

export { ImageOverride };
