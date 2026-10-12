import type { TFile } from '@sharkord/shared';

const getDevelopmentServerPort = () => VITE_SERVER_PORT;

const getHostFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return `localhost:${getDevelopmentServerPort()}`;
  }

  return window.location.host;
};

const getUrlFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return `http://localhost:${getDevelopmentServerPort()}`;
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
