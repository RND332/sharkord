import type { TFile } from '@dodecagon/shared';

const getDevelopmentServerPort = () => VITE_SERVER_PORT;

const getHostFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return `localhost:${getDevelopmentServerPort()}`;
  }

  // the server renders without a window, the browser resolves the relative
  // paths of the page against its own origin
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.host;
};

const getUrlFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return `http://localhost:${getDevelopmentServerPort()}`;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const host = window.location.host;
  const currentProtocol = window.location.protocol;

  const finalUrl = `${currentProtocol}//${host}`;

  return finalUrl;
};

const getFileUrl = (file: TFile | undefined | null) => {
  if (!file) return '';

  const url = getUrlFromServer();

  let baseUrl = `${url}/public/${encodeURIComponent(file.name)}`;

  if (file._accessToken) {
    baseUrl += `?accessToken=${file._accessToken}`;

    if (file._accessTokenExpiresAt) {
      baseUrl += `&expires=${file._accessTokenExpiresAt}`;
    }
  }

  return baseUrl;
};

export { getFileUrl, getHostFromServer, getUrlFromServer };
