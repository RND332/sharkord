import {
  setServerBridge,
  THttpServiceError,
  type TServerBridge
} from '@dodecagon/shared';
import { authenticateUserService } from './services/auth';
import {
  consumeOidcCallbackService,
  consumeOidcHandoffService,
  createOidcLoginService,
  verifyBackchannelLogoutService
} from './services/oidc';
import { listPluginComponentIdsService } from './services/plugins';
import { getServerInfoService } from './services/server-info';
import type { TServiceResult } from './services/service-result';

// the bridge cannot carry a failure in its return type, so a service that failed
// throws and the caller reads the error off the exception
const unwrap = <TBody>(result: TServiceResult<TBody>): TBody => {
  if (!result.ok) {
    throw new THttpServiceError(result.error);
  }

  return result.body;
};

const installServerBridge = (): void => {
  const bridge: TServerBridge = {
    getServerInfo: () => getServerInfoService(),
    authenticateUser: async (input, context) =>
      unwrap(await authenticateUserService(input, context)),
    createOidcLogin: async (context) =>
      unwrap(await createOidcLoginService(context)),
    consumeOidcCallback: async (input, context) =>
      unwrap(await consumeOidcCallbackService(input, context)),
    consumeOidcHandoff: async (code, context) =>
      unwrap(await consumeOidcHandoffService(code, context)),
    verifyBackchannelLogout: async (token, context) =>
      unwrap(await verifyBackchannelLogoutService(token, context)),
    listPluginComponentIds: () => listPluginComponentIdsService()
  };

  setServerBridge(bridge);
};

export { installServerBridge };
