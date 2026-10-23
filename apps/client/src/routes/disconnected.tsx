import { useDisconnectInfo } from '@/features/server/hooks';
import { Disconnected } from '@/screens/disconnected';
import { LoadingApp } from '@/screens/loading-app';
import { ClientOnly, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/disconnected')({
  component: DisconnectedRoute
});

function DisconnectedRoute() {
  const info = useDisconnectInfo();

  if (!info) {
    return <LoadingApp text="Loading" />;
  }

  return (
    <ClientOnly fallback={<LoadingApp text="Loading" />}>
      <Disconnected info={info} />
    </ClientOnly>
  );
}
