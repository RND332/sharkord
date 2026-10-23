import { getServerInfo } from '@/features/server/server-functions';
import { Connect } from '@/screens/connect';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/connect')({
  loader: async () => {
    const info = await getServerInfo();

    return { info };
  },
  component: ConnectRoute
});

function ConnectRoute() {
  const { info } = Route.useLoaderData();

  return <Connect info={info} />;
}
