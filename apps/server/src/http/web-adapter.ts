import type http from 'http';
import { Readable } from 'node:stream';

// the start server speaks the web fetch api, the bun http server speaks node
// streams, so every request has to cross that boundary before the route sees it
type TWebRequestInit = RequestInit & { duplex?: 'half' };

// the dispatcher resolves the client ip, the public origin and the body limit
// before the request leaves bun, because the start server cannot see the socket
// and must not trust the headers of the caller
const toWebRequest = (
  req: http.IncomingMessage,
  url: URL,
  extraHeaders?: Record<string, string>
): Request => {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }

      continue;
    }

    headers.set(key, value);
  }

  for (const [key, value] of Object.entries(extraHeaders ?? {})) {
    headers.set(key, value);
  }

  const method = req.method ?? 'GET';
  const init: TWebRequestInit = { method, headers };

  // a body is only allowed on the methods that can carry one
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = 'half';
  }

  // the url object is not accepted by the request constructor without the dom lib
  return new Request(url.toString(), init);
};

const writeChunk = (res: http.ServerResponse, chunk: Uint8Array) =>
  new Promise<void>((resolve) => {
    if (res.write(Buffer.from(chunk))) {
      resolve();

      return;
    }

    res.once('drain', () => resolve());
  });

const sendWebResponse = async (
  res: http.ServerResponse,
  response: Response
): Promise<void> => {
  res.statusCode = response.status;

  // the cookie header can repeat and a plain iteration would fold the repeats into
  // one comma separated value, which the browser would read as a single broken cookie
  const cookies = response.headers.getSetCookie();

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;

    res.setHeader(key, value);
  });

  if (cookies.length > 0) {
    res.setHeader('set-cookie', cookies);
  }

  if (!response.body) {
    res.end();

    return;
  }

  const reader = response.body.getReader();

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    await writeChunk(res, value);
  }

  res.end();
};

export { sendWebResponse, toWebRequest };
