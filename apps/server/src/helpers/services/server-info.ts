import type { TServerInfo } from '@dodecagon/shared';
import { getSettings } from '../../db/queries/server';
import { getOidcServerInfo } from '../oidc/settings';

const getServerInfoService = async (): Promise<TServerInfo> => {
  const settings = await getSettings();

  return {
    serverId: settings.serverId,
    name: settings.name,
    description: settings.description,
    logo: settings.logo,
    allowNewUsers: settings.allowNewUsers,
    ...getOidcServerInfo()
  };
};

export { getServerInfoService };
