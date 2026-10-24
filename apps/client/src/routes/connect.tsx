import { getRequestContext } from '@/features/server/request-context';
import { getServerInfo } from '@/features/server/server-functions';
import { Connect } from '@/screens/connect';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/connect')({
  loader: async () => {
    const [info, requestContext] = await Promise.all([
      getServerInfo(),
      getRequestContext()
    ]);
    const search = requestContext.search;

    return {
      info,
      search,
      oidcError: new URLSearchParams(search).get('oidc_error'),
      isSecureContext: requestContext.isSecure
    };
  },
  component: ConnectRoute
});

function ConnectRoute() {
  const { info, search, oidcError, isSecureContext } = Route.useLoaderData();

  return (
    <Connect
      info={info}
      search={search}
      oidcError={oidcError}
      isSecureContext={isSecureContext}
    />
  );
}
