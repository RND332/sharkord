import { getTRPCClient } from '@/lib/trpc';
import { useEffect, useState } from 'react';

const useDmPartner = (channelId: number, isDm: boolean) => {
  const [partnerId, setPartnerId] = useState<number>();

  useEffect(() => {
    if (!isDm) {
      setPartnerId(undefined);
      return;
    }

    let cancelled = false;
    const trpc = getTRPCClient();

    trpc.dms.get
      .query()
      .then((conversations) => {
        if (cancelled) return;
        const conversation = conversations.find(
          (item) => item.channelId === channelId
        );
        setPartnerId(conversation?.userId);
      })
      .catch(() => {
        if (!cancelled) setPartnerId(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, isDm]);

  return partnerId;
};

export { useDmPartner };
