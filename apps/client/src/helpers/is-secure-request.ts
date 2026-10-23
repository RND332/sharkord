import { StartRequestHeaders } from '@dodecagon/shared';

// a browser treats the loopback addresses as a secure context, so the server
// has to answer the same way to keep the first render of the browser equal to
// the html of the server
const isSecureRequest = (request: Request): boolean => {
  const header = request.headers.get(StartRequestHeaders.SECURE);

  if (header) {
    return header === 'true';
  }

  const url = new URL(request.url);

  return (
    url.protocol === 'https:' ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  );
};

export { isSecureRequest };
