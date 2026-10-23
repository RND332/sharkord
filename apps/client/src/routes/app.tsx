import { LoadingApp } from '@/screens/loading-app';
import { ServerView } from '@/screens/server-view';
import { ClientOnly, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app')({
  component: AppRoute
});

function AppRoute() {
  // the server view needs the connection of the browser, it cannot be rendered
  // on the server
  return (
    <ClientOnly fallback={<LoadingApp text="Loading" />}>
      <ServerView />
    </ClientOnly>
  );
}
