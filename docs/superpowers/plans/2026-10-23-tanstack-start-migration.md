# TanStack Start Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести клиент и HTTP-поверхность Dodecagon на TanStack Start: Start-сервер живёт внутри Bun-процесса, публичная поверхность уезжает на server routes, приложение рендерится на сервере целиком.

**Architecture:** Один Bun-процесс. Bun-ядро владеет БД, плагинами, mediasoup и tRPC. Start-сервер из `dist/server/server.js` вшивается в бинарник, распаковывается при старте и обслуживает SSR и server routes. Доступ server routes к состоянию ядра идёт через мост `TServerBridge` в `packages/shared`.

**Tech Stack:** Bun 1.4.4, React 19, `@tanstack/react-start@1.168.61`, `@tanstack/react-router@1.170.42`, Drizzle + `bun:sqlite`, `ws`, `vitest` (визуальные), `bun test` (юнит).

**Spec:** `docs/superpowers/specs/2026-10-23-tanstack-start-migration-design.md`

## Global Constraints

- Публичные URL не меняются: `/login`, `/info`, `/manifest.json`, `/healthz`, `/oidc/login`, `/oidc/callback`, `/oidc/exchange`, `/oidc/backchannel-logout`, `/plugin-components`, `/upload`, `/public/*`, `/plugin-bundle/*`, `/plugins/*`.
- Форматы тел и коды ответов API сохраняются один в один: клиент, десктопное приложение, OIDC-провайдер и плагины завязаны на них.
- Никаких тире (`—`) в коде, комментариях, строках интерфейса и сообщениях коммитов.
- Комментарии начинаются с маленькой буквы и объясняют почему, а не что.
- Имена файлов kebab-case, экспорты именованные, типы с префиксом `T`, никаких `any`.
- Никаких вложенных тернарников, никакого чейна от результата вызова, никакого префикса `void`.
- Версию не поднимать: задача не релиз.
- Гейты перед коммитом: `bun run format:check`, `bun run check-types`, `bun run lint`, `bun run test` из корня.
- Визуальные эталоны (`apps/client/src/visual-tests/__screenshots__/`) в этом PR не трогать, они обновляются отдельным PR после слияния.
- Коммиты идут в ветку `agent/tanstack-start-migration`, PR открывается в `master` после последнего коммита.
- В разработке API-пути остаются за Bun-сервером, в релизе их обслуживает Start-сервер (раздел 4.8 спеки).

---

### Task 1: Мост и сервисный слой

Логика из тел HTTP-хендлеров выносится в переиспользуемые функции, а общий пакет получает интерфейс моста и таксономию ошибок. Дальше на этом слое строятся server routes.

**Files:**
- Create: `packages/shared/src/server-bridge.ts`
- Create: `packages/shared/src/http-errors.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/server/src/helpers/services/server-info.ts`
- Create: `apps/server/src/helpers/services/auth.ts`
- Create: `apps/server/src/helpers/services/oidc.ts`
- Create: `apps/server/src/helpers/services/plugins.ts`
- Create: `apps/server/src/helpers/server-bridge.ts`
- Modify: `apps/server/src/index.ts`
- Test: `apps/server/src/helpers/__tests__/server-bridge.test.ts`

**Interfaces:**
- Consumes: существующие хендлеры `apps/server/src/http/{info,login,manifest,oidc/*,plugins-components}.ts`, хелперы `apps/server/src/helpers/oidc/manager.ts`, `apps/server/src/helpers/file-manager.ts`, запросы `apps/server/src/db/queries/*`.
- Produces:
  - `packages/shared`: `TServerBridge`, `setServerBridge(value: TServerBridge): void`, `getServerBridge(): TServerBridge`, `THttpFieldError`, `THttpError`, `toHttpResponse(result: TServiceResult): Response`.
  - `apps/server`: `installServerBridge(): void`, `getServerInfoService(): Promise<TServerInfo>`, `authenticateUserService(input: TLoginInput): Promise<TLoginResult>`, `createOidcLoginService(): Promise<TOidcLoginResult>`, `consumeOidcCallbackService(input: TOidcCallbackInput): Promise<TOidcCallbackResult>`, `consumeOidcHandoffService(code: string): Promise<string>`, `verifyBackchannelLogoutService(token: string): Promise<TOidcLogoutResult>`, `listPluginComponentIdsService(): Promise<string[]>`.

- [x] **Step 1: Описать таксономию ошибок в общем пакете**

Создать `packages/shared/src/http-errors.ts`:

```ts
export interface THttpFieldError {
  field: string;
  message: string;
}

export type THttpError =
  | { kind: 'field'; errors: THttpFieldError[] }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'too-large'; message: string }
  | { kind: 'rate-limited'; message: string; retryAfter: number }
  | { kind: 'internal'; message: string };

export type THttpResult<TBody = unknown> =
  | { ok: true; status: number; body: TBody }
  | { ok: false; error: THttpError };
```

Функция ответа живёт рядом и переводит ошибку в тот же JSON, что отдаёт текущий сервер:

```ts
export const toHttpResponse = <TBody>(result: THttpResult<TBody>): Response => {
  if (result.ok) {
    return Response.json(result.body, { status: result.status });
  }

  const error = result.error;

  if (error.kind === 'field') {
    const errors: Record<string, string> = {};

    for (const item of error.errors) {
      errors[item.field] = item.message;
    }

    return Response.json({ errors }, { status: 400 });
  }

  if (error.kind === 'rate-limited') {
    return Response.json(
      { error: error.message },
      { status: 429, headers: { 'Retry-After': String(error.retryAfter) } }
    );
  }

  const status =
    error.kind === 'unauthorized'
      ? 401
      : error.kind === 'forbidden'
        ? 403
        : error.kind === 'not-found'
          ? 404
          : error.kind === 'too-large'
            ? 413
            : 500;

  return Response.json({ error: error.message }, { status });
};
```

- [x] **Step 2: Описать интерфейс моста**

Создать `packages/shared/src/server-bridge.ts`:

```ts
import type { TLocale, TServerInfo } from './types';

export interface TLoginInput {
  identity: string;
  password: string;
  invite?: string;
}

export interface TLoginResult {
  token: string;
}

export interface TOidcLoginResult {
  location: string;
  cookie: string;
}

export interface TOidcCallbackInput {
  state: string | null;
  code: string | null;
  error: string | null;
}

export interface TOidcCallbackResult {
  location: string;
  cookie?: string;
}

export interface TOidcLogoutResult {
  userId: string;
}

export interface TServerBridge {
  getServerInfo(): Promise<TServerInfo>;
  authenticateUser(input: TLoginInput): Promise<TLoginResult>;
  createOidcLogin(): Promise<TOidcLoginResult>;
  consumeOidcCallback(input: TOidcCallbackInput): Promise<TOidcCallbackResult>;
  consumeOidcHandoff(code: string): Promise<string>;
  verifyBackchannelLogout(token: string): Promise<TOidcLogoutResult>;
  listPluginComponentIds(): Promise<string[]>;
}

let bridge: TServerBridge | null = null;

export const setServerBridge = (value: TServerBridge) => {
  bridge = value;
};

export const getServerBridge = (): TServerBridge => {
  if (!bridge) {
    throw new Error('the server bridge is not installed');
  }

  return bridge;
};
```

Добавить оба файла в экспорт `packages/shared/src/index.ts`.

- [x] **Step 3: Вынести сервисные функции сервера**

Каждая сервисная функция возвращает данные, а не пишет в ответ. Форма результата общая:

```ts
export type TServiceResult<TBody> =
  | { ok: true; body: TBody }
  | { ok: false; error: THttpError };
```

Создать `apps/server/src/helpers/services/server-info.ts`:

```ts
import type { TServerInfo } from '@dodecagon/shared';
import { getSettings } from '@/db/queries/server';

export const getServerInfoService = async (): Promise<TServerInfo> => {
  const settings = await getSettings();

  return {
    serverId: settings.serverId,
    name: settings.name,
    description: settings.description,
    logo: settings.logo,
    allowNewUsers: settings.allowNewUsers,
    oidcEnabled: settings.oidcEnabled,
    oidcDisableLocalLogin: settings.oidcDisableLocalLogin
  };
};
```

Создать `apps/server/src/helpers/services/plugins.ts`:

```ts
export const listPluginComponentIdsService = async (): Promise<string[]> => {
  if (!config.server.enablePlugins) {
    return [];
  }

  return pluginManager.getComponentPluginIds();
};
```

Создать `apps/server/src/helpers/services/auth.ts`, перенеся в него тело
`apps/server/src/http/login.ts` без записи в `res`:

```ts
export const authenticateUserService = async (
  input: TLoginInput
): Promise<TServiceResult<TLoginResult>> => {
  const identity = input.identity.trim().toLowerCase();

  if (!identity || input.password.length < 4 || input.password.length > 128) {
    return {
      ok: false,
      error: { kind: 'field', errors: [{ field: 'identity', message: 'Invalid identity' }] }
    };
  }

  const user = await getUserByIdentity(identity);

  if (!user || !(await Bun.password.verify(input.password, user.password))) {
    return {
      ok: false,
      error: { kind: 'field', errors: [{ field: 'password', message: 'Wrong password' }] }
    };
  }

  const allowed = await pluginManager.runBeforeLogin(user.id);

  if (!allowed) {
    return {
      ok: false,
      error: { kind: 'field', errors: [{ field: 'identity', message: 'Sign in is blocked' }] }
    };
  }

  return { ok: true, body: { token: await createUserToken(user.id) } };
};
```

Соответствие проверок текущему `apps/server/src/http/login.ts` (зарезервированный
идентификатор, режим «только OIDC», инвайты, блокировка новых пользователей, бан) переносится
одним за другим, каждое возвращает `THttpError` с полем формы.

Создать `apps/server/src/helpers/services/oidc.ts` с четырьмя функциями:
`createOidcLoginService` возвращает `{ location, cookie }`, `consumeOidcCallbackService`
возвращает `{ location }` или `{ location, cookie }`, `consumeOidcHandoffService` возвращает
токен, `verifyBackchannelLogoutService` возвращает `{ userId }`. Тела берутся из
`apps/server/src/http/oidc/{login,callback,exchange,backchannel-logout}.ts` без записи в `res`
и без чтения заголовков запроса: всё, что нужно, передаётся параметрами.

- [x] **Step 4: Написать тест сервисного слоя**

Создать `apps/server/src/helpers/__tests__/server-bridge.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { getServerBridge, setServerBridge } from '@dodecagon/shared';
import { installServerBridge } from '../server-bridge';

describe('the server bridge', () => {
  test('throws when the bridge is not installed', () => {
    expect(() => getServerBridge()).toThrow('the server bridge is not installed');
  });

  test('returns the installed implementation', async () => {
    installServerBridge();

    const bridge = getServerBridge();

    expect(typeof bridge.getServerInfo).toBe('function');
  });
});
```

- [x] **Step 5: Реализовать установку моста**

Создать `apps/server/src/helpers/server-bridge.ts`:

```ts
import { setServerBridge } from '@dodecagon/shared';
import { authenticateUserService } from './services/auth';
import {
  consumeOidcCallbackService,
  consumeOidcHandoffService,
  createOidcLoginService,
  verifyBackchannelLogoutService
} from './services/oidc';
import { listPluginComponentIdsService } from './services/plugins';
import { getServerInfoService } from './services/server-info';

export const installServerBridge = () => {
  setServerBridge({
    getServerInfo: () => getServerInfoService(),
    authenticateUser: (input) => authenticateUserService(input),
    createOidcLogin: () => createOidcLoginService(),
    consumeOidcCallback: (input) => consumeOidcCallbackService(input),
    consumeOidcHandoff: (code) => consumeOidcHandoffService(code),
    verifyBackchannelLogout: (token) => verifyBackchannelLogoutService(token),
    listPluginComponentIds: () => listPluginComponentIdsService()
  });
};
```

В `apps/server/src/index.ts` вызвать `installServerBridge()` между `await pluginManager.init();` и `await createServers();`. Порядок загрузки импортов сверху файла не трогать.

- [x] **Step 6: Прогнать проверки и закоммитить**

Run: `cd apps/server && bun test src/helpers/__tests__/server-bridge.test.ts`
Expected: PASS, 2 теста.

Run: `cd apps/server && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0 у всех трёх.

```bash
git add packages/shared/src apps/server/src
git commit -m "refactor: add the server bridge and the shared service functions"
```

---

### Task 2: Start-сервер внутри бинарника

Собранный Start-бандл попадает в бинарник, распаковывается при старте и поднимается как обработчик запросов.

**Files:**
- Modify: `apps/server/build/build.ts`
- Modify: `apps/server/build/helpers.ts`
- Modify: `apps/server/src/helpers/embeds.ts`
- Modify: `apps/server/src/helpers/paths.ts`
- Create: `apps/server/src/helpers/start-server.ts`
- Create: `apps/server/src/http/web-adapter.ts`
- Test: `apps/server/src/http/__tests__/web-adapter.test.ts`

**Interfaces:**
- Consumes: `apps/client/dist/server/server.js`, который собирает плагин `tanstackStart`.
- Produces:
  - `apps/server/src/helpers/start-server.ts`: `getStartHandler(): Promise<((request: Request) => Promise<Response>) | null>`, `closeStartServer(): Promise<void>`.
  - `apps/server/src/http/web-adapter.ts`: `toWebRequest(req: http.IncomingMessage, url: URL): Request`, `sendWebResponse(res: http.ServerResponse, response: Response): Promise<void>`.

- [x] **Step 1: Написать тест адаптера**

Создать `apps/server/src/http/__tests__/web-adapter.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { sendWebResponse, toWebRequest } from '../web-adapter';

const createRequest = (url: string, method = 'GET', body?: string) => {
  const req = new IncomingMessage(new Socket());

  req.url = url;
  req.method = method;
  req.headers = { 'x-token': 'secret' };

  if (body !== undefined) {
    req.push(body);
    req.push(null);
  }

  return req;
};

describe('the web adapter', () => {
  test('builds a request with the method, the url and the headers', async () => {
    const request = toWebRequest(createRequest('/info'), new URL('http://localhost/info'));

    expect(request.method).toBe('GET');
    expect(request.url).toBe('http://localhost/info');
    expect(request.headers.get('x-token')).toBe('secret');
  });

  test('writes the status, the headers and the body into the response', async () => {
    const res = new ServerResponse(createRequest('/info'));

    const chunks: Buffer[] = [];

    res.write = ((chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));

      return true;
    }) as typeof res.write;

    await sendWebResponse(res, Response.json({ status: 'ok' }, { status: 201 }));

    expect(res.statusCode).toBe(201);
    expect(res.getHeader('content-type')).toContain('application/json');
    expect(Buffer.concat(chunks).toString()).toBe('{"status":"ok"}');
  });
});
```

- [x] **Step 2: Реализовать адаптер**

Создать `apps/server/src/http/web-adapter.ts`:

```ts
import type http from 'http';
import { Readable } from 'node:stream';

const toWebRequest = (req: http.IncomingMessage, url: URL): Request => {
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

  const method = req.method ?? 'GET';
  const init: RequestInit & { duplex?: 'half' } = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = 'half';
  }

  return new Request(url, init);
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

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

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
```

- [x] **Step 3: Упаковать Start-бандл в релиз**

В `apps/server/build/build.ts` рядом с созданием `interface.zip` добавить создание `server.zip` из `apps/client/dist/server`:

```ts
const serverBundlePath = path.join(clientCwd, 'dist', 'server');
const serverZipPath = path.join(buildTempPath, 'server.zip');

console.log('Creating server.zip...');

await zipDirectory(serverBundlePath, serverZipPath);
```

В `apps/server/build/helpers.ts` в массив `entryPoints` добавить `path.join(serverCwd, 'build', 'temp', 'server.zip')`.

- [x] **Step 4: Распаковывать и поднимать Start-сервер**

В `apps/server/src/helpers/paths.ts` добавить `SERVER_BUNDLE_PATH` рядом с `INTERFACE_PATH`, по тому же образцу: `path.resolve(DATA_PATH, 'server-bundle', SERVER_VERSION)`.

В `apps/server/src/helpers/embeds.ts` рядом с распаковкой интерфейса добавить распаковку `server.zip` в `SERVER_BUNDLE_PATH` тем же способом, что и для `interface.zip`, и учесть `server.zip` в проверке `if (!interfaceBlob || !drizzleBlob || !mediasoupBlob)`.

Создать `apps/server/src/helpers/start-server.ts`:

```ts
import path from 'path';
import { SERVER_BUNDLE_PATH } from './paths';

type TStartHandler = (request: Request) => Promise<Response>;

let handler: TStartHandler | null = null;

const getStartHandler = async (): Promise<TStartHandler | null> => {
  if (handler) return handler;

  const entryPath = path.join(SERVER_BUNDLE_PATH, 'server.js');

  try {
    const mod = await import(entryPath);
    const entry = mod.default;

    if (!entry || typeof entry.fetch !== 'function') {
      return null;
    }

    handler = (request: Request) => entry.fetch(request);

    return handler;
  } catch {
    // the interface still works as a static site without the start server
    return null;
  }
};

export { getStartHandler };
```

- [x] **Step 5: Прогнать проверки и закоммитить**

Run: `cd apps/server && bun test src/http/__tests__/web-adapter.test.ts`
Expected: PASS, 2 теста.

Run: `cd apps/server && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0.

```bash
git add apps/server/build apps/server/src
git commit -m "feat: run the tanstack start server inside the bun process"
```

---

### Task 3: Диспетчер: какие пути уходят в Start

Bun-сервер перестаёт быть единственным источником ответов: часть путей уходит в Start-обработчик, остальные остаются в Bun.

**Files:**
- Modify: `apps/server/src/http/index.ts`
- Test: `apps/server/src/http/__tests__/dispatch.test.ts`

**Interfaces:**
- Consumes: `getStartHandler()` из `apps/server/src/helpers/start-server.ts`, `toWebRequest` и `sendWebResponse` из `apps/server/src/http/web-adapter.ts`.
- Produces: `apps/server/src/http/index.ts`: `START_PATHS: ReadonlySet<string>`, `isStartPath(pathname: string): boolean`.

- [x] **Step 1: Написать тест выбора пути**

Создать `apps/server/src/http/__tests__/dispatch.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { isStartPath } from '../index';

describe('the path dispatch', () => {
  test('sends the interface and the api paths to the start server', () => {
    expect(isStartPath('/')).toBe(true);
    expect(isStartPath('/info')).toBe(true);
    expect(isStartPath('/manifest.json')).toBe(true);
    expect(isStartPath('/login')).toBe(true);
    expect(isStartPath('/healthz')).toBe(true);
  });

  test('keeps the file and the plugin paths in bun', () => {
    expect(isStartPath('/upload')).toBe(false);
    expect(isStartPath('/public/file.png')).toBe(false);
    expect(isStartPath('/plugin-bundle/demo/client/index.js')).toBe(false);
    expect(isStartPath('/plugins/demo/hook')).toBe(false);
  });
});
```

- [x] **Step 2: Описать множество путей Start**

В `apps/server/src/http/index.ts` добавить:

```ts
const START_PATHS = new Set([
  '/',
  '/connect',
  '/app',
  '/disconnected',
  '/info',
  '/manifest.json',
  '/healthz',
  '/login',
  '/plugin-components',
  '/oidc/login',
  '/oidc/callback',
  '/oidc/exchange',
  '/oidc/backchannel-logout'
]);

const isStartPath = (pathname: string) => START_PATHS.has(pathname);
```

- [x] **Step 3: Делегировать Start-пути в обработчик**

В обработчике запроса `apps/server/src/http/index.ts` поставить проверку до таблицы точных маршрутов:

```ts
const startHandler = await getStartHandler();

if (startHandler && isStartPath(url.pathname)) {
  const response = await startHandler(toWebRequest(req, url));

  await sendWebResponse(res, response);

  return res;
}
```

Обработчик вызывается асинхронно, поэтому функция `interfaceRouteHandler` и её вызывающий код должны стать асинхронными. Проверить, что все места, которые вызывают обработчик, уже в асинхронном контексте.

В разработке распакованного бандла нет, поэтому `getStartHandler()` вернёт `null`, и проверка
не сработает: API-пути останутся за Bun-хендлерами. Это и есть режим разработки из
раздела 4.8 спеки, отдельного кода для него не нужно.

- [x] **Step 4: Прогнать проверки и закоммитить**

Run: `cd apps/server && bun test src/http/__tests__/dispatch.test.ts`
Expected: PASS, 2 теста.

Run: `cd apps/server && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0.

```bash
git add apps/server/src/http
git commit -m "feat: route the interface and the api paths through the start server"
```

---

### Task 4: Server routes: информация, манифест, здоровье, плагины

Четыре пути переезжают на server routes Start. Это первая настоящая проверка моста: server route живёт в `apps/client` и видит состояние Bun-ядра.

**Files:**
- Create: `apps/client/src/routes/info.ts`
- Create: `apps/client/src/routes/manifest[.]json.ts`
- Create: `apps/client/src/routes/healthz.ts`
- Create: `apps/client/src/routes/plugin-components.ts`
- Create: `apps/client/src/routes/__tests__/server-routes.test.ts`

**Interfaces:**
- Consumes: `getServerBridge()` из `@dodecagon/shared`, `toHttpResponse` из `@dodecagon/shared`.
- Produces: HTTP-ответы, совпадающие с текущими хендлерами `apps/server/src/http/{info,manifest,healthz,plugins-components}.ts`.

- [x] **Step 1: Написать тест server routes**

Создать `apps/client/src/routes/__tests__/server-routes.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { setServerBridge } from '@dodecagon/shared';
import { Route as HealthzRoute } from '../healthz';
import { Route as InfoRoute } from '../info';

const callHandler = async (
  route: typeof HealthzRoute,
  method: 'GET' | 'POST',
  url: string,
  body?: unknown
) => {
  const handlers = route.options?.server?.handlers as
    | Record<string, (ctx: unknown) => Promise<Response>>
    | undefined;

  const handler = handlers?.[method];

  if (!handler) {
    throw new Error(`the route has no ${method} handler`);
  }

  return handler({
    request: new Request(url, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'content-type': 'application/json' }
    }),
    params: {},
    context: {},
    pathname: new URL(url).pathname,
    next: () => ({ isNext: true, context: {} })
  });
};

const callGet = (route: typeof HealthzRoute, url: string) =>
  callHandler(route, 'GET', url);

const callPost = (route: typeof HealthzRoute, url: string, body: unknown) =>
  callHandler(route, 'POST', url, body);

describe('the start server routes', () => {
  test('answers the health check', async () => {
    const response = await callGet(HealthzRoute, 'http://localhost/healthz');

    expect(response.status).toBe(200);
  });

  test('answers the server info through the bridge', async () => {
    setServerBridge({
      getServerInfo: async () => ({
        serverId: 'demo',
        name: 'Demo',
        description: '',
        logo: null,
        allowNewUsers: true,
        oidcEnabled: false,
        oidcDisableLocalLogin: false
      }),
      authenticateUser: async () => ({ token: 'token' }),
      createOidcLogin: async () => ({ location: '/', cookie: '' }),
      consumeOidcCallback: async () => ({ location: '/' }),
      consumeOidcHandoff: async () => 'token',
      verifyBackchannelLogout: async () => ({ userId: 'user' }),
      listPluginComponentIds: async () => []
    });

    const response = await callGet(InfoRoute, 'http://localhost/info');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe('Demo');
  });
});
```

- [x] **Step 2: Реализовать роут информации**

Создать `apps/client/src/routes/info.ts`:

```ts
import { getServerBridge, toHttpResponse } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/info')({
  server: {
    handlers: {
      GET: async () => {
        const bridge = getServerBridge();
        const info = await bridge.getServerInfo();

        return toHttpResponse({ ok: true, status: 200, body: info });
      }
    }
  }
});
```

- [x] **Step 3: Реализовать остальные три роута**

`apps/client/src/routes/healthz.ts` отвечает `Response.json({ status: 'ok', timestamp: Date.now() })` без обращения к мосту.

`apps/client/src/routes/manifest[.]json.ts` собирает манифест так же, как `apps/server/src/http/manifest.ts`, но берёт настройки и логотип через мост. Заголовок `Content-Type` должен быть `application/manifest+json`, кеш `public, max-age=3600`.

`apps/client/src/routes/plugin-components.ts` возвращает массив идентификаторов из `bridge.listPluginComponentIds()`.

- [x] **Step 4: Проверить, что пути не попали в клиентский бандл**

Run: `cd apps/client && bun run build`
Expected: сборка проходит, в `dist/client` нет строки `createFileRoute('/info')`, а в `dist/server` есть.

```bash
grep -rl "server-bridge" apps/client/dist/client || echo "клиентский бандл чист"
```

- [x] **Step 5: Прогнать проверки и закоммитить**

Run: `cd apps/client && bun test src/routes/__tests__/server-routes.test.ts`
Expected: PASS, 2 теста.

Run: `cd apps/client && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0.

```bash
git add apps/client/src/routes
git commit -m "feat: serve the server info and the manifest from the start server"
```

---

### Task 5: Server routes: логин и OIDC

Логин и весь OIDC-цикл переезжают на server routes. Здесь важна точность ответов: cookie, редиректы и коды ошибок.

**Files:**
- Create: `apps/client/src/routes/login.ts`
- Create: `apps/client/src/routes/oidc/login.ts`
- Create: `apps/client/src/routes/oidc/callback.ts`
- Create: `apps/client/src/routes/oidc/exchange.ts`
- Create: `apps/client/src/routes/oidc/backchannel-logout.ts`
- Modify: `apps/client/src/routes/__tests__/server-routes.test.ts`

**Interfaces:**
- Consumes: `getServerBridge()`, `toHttpResponse`.
- Produces: те же ответы, что у `apps/server/src/http/login.ts` и `apps/server/src/http/oidc/*`.

- [x] **Step 1: Завести тип ошибки поля в общем пакете**

В `packages/shared/src/http-errors.ts` добавить класс:

```ts
export class TLoginFieldError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}
```

В `toHttpResponse` добавить ветку: если ошибка это `TLoginFieldError`, ответ `400` с телом `{ errors: { [field]: message } }`.

- [x] **Step 2: Написать тесты логина**

Дополнить `apps/client/src/routes/__tests__/server-routes.test.ts` тестом, который проверяет тело ошибки валидации:

```ts
test('answers the login field errors', async () => {
  setServerBridge({
    getServerInfo: async () => ({
      serverId: 'demo',
      name: 'Demo',
      description: '',
      logo: null,
      allowNewUsers: true,
      oidcEnabled: false,
      oidcDisableLocalLogin: false
    }),
    authenticateUser: async () => {
      throw new TLoginFieldError('identity', 'The identity is already taken');
    },
    createOidcLogin: async () => ({ location: '/', cookie: '' }),
    consumeOidcCallback: async () => ({ location: '/' }),
    consumeOidcHandoff: async () => 'token',
    verifyBackchannelLogout: async () => ({ userId: 'user' }),
    listPluginComponentIds: async () => []
  });

  const response = await callPost(LoginRoute, 'http://localhost/login', {
    identity: 'demo',
    password: 'secret'
  });
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.errors.identity).toBe('The identity is already taken');
});
```

- [x] **Step 3: Реализовать роут логина**

Создать `apps/client/src/routes/login.ts`:

```ts
import { getServerBridge, toHttpResponse } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bridge = getServerBridge();
        const input = await request.json();

        try {
          const result = await bridge.authenticateUser(input);

          return toHttpResponse({ ok: true, status: 200, body: result });
        } catch (error) {
          return toHttpResponse({ ok: false, error: toHttpError(error) });
        }
      }
    }
  }
});
```

- [x] **Step 4: Реализовать OIDC-роуты**

`apps/client/src/routes/oidc/login.ts` вызывает `bridge.createOidcLogin()` и отдаёт `Response` со статусом 302, заголовком `Location` и `Set-Cookie` из результата.

`apps/client/src/routes/oidc/callback.ts` вызывает `bridge.consumeOidcCallback({ state, code, error })` из параметров запроса и отдаёт редирект 302 с `Location` и, если он есть, `Set-Cookie`.

`apps/client/src/routes/oidc/exchange.ts` читает тело `{ code }`, вызывает `bridge.consumeOidcHandoff(code)` и отдаёт `{ success: true, token }` с заголовком `Cache-Control: no-store` и очисткой state-cookie.

`apps/client/src/routes/oidc/backchannel-logout.ts` читает форму `logout_token`, вызывает `bridge.verifyBackchannelLogout(token)` и отдаёт пустой ответ 200 с `Cache-Control: no-store`.

- [x] **Step 5: Прогнать проверки и закоммитить**

Run: `cd apps/client && bun test src/routes/__tests__/server-routes.test.ts`
Expected: PASS, 3 теста.

Run: `cd apps/client && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0.

```bash
git add packages/shared/src apps/client/src/routes
git commit -m "feat: serve the login and the oidc flow from the start server"
```

---

### Task 6: Server functions и загрузчик экрана подключения

Клиент перестаёт ходить за данными сервера вручную: `fetchServerInfo` становится server function, а загрузчик роута `/connect` приносит данные вместе с HTML.

**Files:**
- Create: `apps/client/src/features/server/server-functions.ts`
- Modify: `apps/client/src/features/app/actions.ts`
- Modify: `apps/client/src/components/plugins-controller/index.tsx`
- Create: `apps/client/src/routes/connect.tsx`
- Test: `apps/client/src/features/server/__tests__/server-functions.test.ts`

**Interfaces:**
- Consumes: `getServerBridge()`.
- Produces: `getServerInfo(): Promise<TServerInfo>`, `getPluginComponentIds(): Promise<string[]>`.

- [x] **Step 1: Написать тест server function**

Создать `apps/client/src/features/server/__tests__/server-functions.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { setServerBridge } from '@dodecagon/shared';
import { getServerInfo } from '../server-functions';

describe('the server functions', () => {
  test('reads the server info through the bridge', async () => {
    setServerBridge({
      getServerInfo: async () => ({
        serverId: 'demo',
        name: 'Demo',
        description: '',
        logo: null,
        allowNewUsers: true,
        oidcEnabled: false,
        oidcDisableLocalLogin: false
      }),
      authenticateUser: async () => ({ token: 'token' }),
      createOidcLogin: async () => ({ location: '/', cookie: '' }),
      consumeOidcCallback: async () => ({ location: '/' }),
      consumeOidcHandoff: async () => 'token',
      verifyBackchannelLogout: async () => ({ userId: 'user' }),
      listPluginComponentIds: async () => []
    });

    const info = await getServerInfo();

    expect(info.name).toBe('Demo');
  });
});
```

- [x] **Step 2: Создать server functions**

Создать `apps/client/src/features/server/server-functions.ts`:

```ts
import { getServerBridge } from '@dodecagon/shared';
import type { TServerInfo } from '@dodecagon/shared';
import { createServerFn } from '@tanstack/react-start';

export const getServerInfo = createServerFn({ method: 'GET' }).handler(
  async () => {
    const bridge = getServerBridge();

    return bridge.getServerInfo();
  }
);

export const getPluginComponentIds = createServerFn({ method: 'GET' }).handler(
  async () => {
    const bridge = getServerBridge();

    return bridge.listPluginComponentIds();
  }
);
```

- [x] **Step 3: Перевести клиентов на server functions**

В `apps/client/src/features/app/actions.ts` функция `fetchServerInfo` становится вызовом `getServerInfo()` вместо `fetch`.

В `apps/client/src/components/plugins-controller/index.tsx` вызов `GET /plugin-components` заменяется на `getPluginComponentIds()`. Сохранить порядок: список компонентов плагинов должен разрешиться до подключения к tRPC, потому что слоты плагинов могут рисоваться на экране входа.

- [x] **Step 4: Добавить загрузчик экрана подключения**

Создать `apps/client/src/routes/connect.tsx` с загрузчиком, который приносит данные сервера и параметры запроса:

```ts
import { getServerInfo } from '@/features/server/server-functions';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/connect')({
  loader: async () => {
    const info = await getServerInfo();

    return { info };
  },
  component: ConnectRoute
});
```

Компонент `ConnectRoute` подключает экран из `apps/client/src/screens/connect/index.tsx` и передаёт ему данные загрузчика вместо чтения стора.

- [x] **Step 5: Прогнать проверки и закоммитить**

Run: `cd apps/client && bun test src/features/server/__tests__/server-functions.test.ts`
Expected: PASS, 1 тест.

Run: `cd apps/client && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0.

```bash
git add apps/client/src
git commit -m "feat: add the server functions and the connect loader"
```

---

### Task 7: Стор на запрос

Модульный синглтон стора нельзя использовать на сервере: состояние одного запроса утекло бы в другой. Стор становится фабрикой, а React-контекст выбирает экземпляр.

**Files:**
- Modify: `apps/client/src/features/store.ts`
- Create: `apps/client/src/features/store-context.tsx`
- Modify: `apps/client/src/features/app/slice.ts`
- Modify: `apps/client/src/features/server/slice.ts`
- Test: `apps/client/src/features/__tests__/store.test.ts`

**Interfaces:**
- Consumes: существующие редьюсеры слайсов.
- Produces: `IStore` с методами `getState`, `dispatch`, `subscribe`, `setState`; `createStore(initialState: IRootState): IStore`; `useStore(): IStore`; `StoreProvider`.

- [x] **Step 1: Написать тест изоляции экземпляров**

Создать `apps/client/src/features/__tests__/store.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createStore } from '../store';

describe('the store', () => {
  test('keeps the state of two instances apart', () => {
    const first = createStore();
    const second = createStore();

    first.dispatch({ type: 'app/setAppLoading', payload: false });

    expect(first.getState().app.appLoading).toBe(false);
    expect(second.getState().app.appLoading).toBe(true);
  });

  test('notifies the subscribers when the state changes', () => {
    const store = createStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });

    store.dispatch({ type: 'app/setAppLoading', payload: false });

    expect(calls).toBe(1);
  });
});
```

- [x] **Step 2: Вынести фабрику стора**

В `apps/client/src/features/store.ts` заменить модульный синглтон на фабрику, сохранив клиентский синглтон для кода вне React:

```ts
export interface IStore {
  getState(): IRootState;
  dispatch(action: TRootAction): void;
  subscribe(listener: () => void): () => void;
  setState(nextState: Partial<IRootState>): void;
}

export const createStore = (): IStore => {
  const listeners = new Set<() => void>();

  let state: IRootState = {
    app: appInitialState,
    server: serverInitialState,
    dialog: dialogInitialState,
    serverScreen: serverScreenInitialState
  };

  const getState = () => state;

  const dispatch = (action: TRootAction) => {
    const nextState = rootReducer(state, action);

    if (nextState === state) return;

    state = nextState;

    for (const listener of listeners) listener();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  const setState = (nextState: Partial<IRootState>) => {
    state = { ...state, ...nextState };
  };

  return { getState, dispatch, subscribe, setState };
};

export const store = createStore();
```

`setStoreState` оставить как обёртку над `store.setState`, чтобы тесты рендера продолжили работать.

- [x] **Step 3: Добавить контекст стора**

Создать `apps/client/src/features/store-context.tsx`:

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { store, type IStore } from './store';

const StoreContext = createContext<IStore>(store);

export const StoreProvider = ({
  children,
  value
}: {
  children: ReactNode;
  value?: IStore;
}) => {
  return (
    <StoreContext.Provider value={value ?? store}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): IStore => useContext(StoreContext);
```

- [x] **Step 4: Перевести селектор на контекст**

В `apps/client/src/features/store.ts` функция `useStoreSelector` берёт стор из `useStore()` и подписывается на него:

```ts
export const useStoreSelector = <T>(selector: (state: IRootState) => T): T => {
  const currentStore = useStore();
  const cache = useRef<{
    state: IRootState;
    selector: (state: IRootState) => T;
    value: T;
  } | null>(null);

  const getSnapshot = useCallback(() => {
    const currentState = currentStore.getState();
    const cached = cache.current;

    if (
      cached &&
      cached.state === currentState &&
      cached.selector === selector
    ) {
      return cached.value;
    }

    const value = selector(currentState);
    cache.current = { state: currentState, selector, value };

    return value;
  }, [currentStore, selector]);

  return useSyncExternalStore(
    currentStore.subscribe,
    getSnapshot,
    getSnapshot
  );
};
```

- [x] **Step 5: Убрать чтения localStorage из initialState**

В `apps/client/src/features/app/slice.ts` и `apps/client/src/features/server/slice.ts` все вызовы `getLocalStorageItemBool`, `getLocalStorageItemAsJSON` и `getLocalStorageItemAsNumber` из `initialState` убрать: на сервере эти значения всё равно недоступны, а первый рендер должен совпадать на сервере и на клиенте.

Вместо этого добавить действие, которое клиент выполняет после гидрации:

```ts
export const hydrateAppFromStorage = () => {
  return {
    type: 'app/hydrateFromStorage' as const,
    payload: {
      autoJoinLastChannel: getLocalStorageItemBool(
        LocalStorageKey.AUTO_JOIN_LAST_CHANNEL,
        false
      )
    }
  };
};
```

Полный список флагов взять из текущего `initialState`: `autoJoinLastChannel`, `browserNotifications`, `browserNotificationsForMentions`, `browserNotificationsForDms`, `browserNotificationsForReplies`, `notificationSounds`, `messageSentSound`, `joinLeaveSounds`, `muteDeafenSounds`, `mutedChannelIds`, `voiceChatSidebarState`, `voiceChatSidebarChannelId`, `pluginSlotDebug`, `hideNonVideoParticipants`, `showUserBannersInVoice`, `hideOwnScreenShare`.

Действие вызывается один раз в корневом роуте через `useEffect`.

- [x] **Step 6: Прогнать проверки и закоммитить**

Run: `cd apps/client && bun test src/features/__tests__/store.test.ts`
Expected: PASS, 2 теста.

Run: `cd apps/client && bun test`
Expected: количество тестов не меньше, чем до правки, ни один не падает.

Run: `cd apps/client && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0.

```bash
git add apps/client/src/features
git commit -m "refactor: give the store an instance per request"
```

---

### Task 8: Язык на запрос и фиксированное время

Два источника расхождения между сервером и клиентом: язык и стенные часы.

**Files:**
- Modify: `apps/client/src/i18n/index.ts`
- Create: `apps/client/src/i18n/i18n-context.tsx`
- Create: `apps/client/src/helpers/render-clock.ts`
- Modify: `apps/client/src/components/relative-time/index.tsx`
- Modify: `apps/client/src/components/reconnecting-overlay/use-countdown-seconds.ts`
- Test: `apps/client/src/i18n/__tests__/i18n.test.ts`

**Interfaces:**
- Consumes: `i18next`, `react-i18next`.
- Produces: `createI18n(language: SupportedLanguage): i18n`, `useRenderClock(): () => number`, `RenderClockProvider`.

- [x] **Step 1: Написать тест языка**

Создать `apps/client/src/i18n/__tests__/i18n.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createI18n } from '../index';

describe('the i18n factory', () => {
  test('creates an instance for the given language', async () => {
    const instance = createI18n('ru');

    await instance.init();

    expect(instance.language).toBe('ru');
  });

  test('keeps two instances apart', async () => {
    const first = createI18n('en');
    const second = createI18n('es');

    await Promise.all([first.init(), second.init()]);

    expect(first.language).toBe('en');
    expect(second.language).toBe('es');
  });
});
```

- [x] **Step 2: Вынести фабрику i18n**

В `apps/client/src/i18n/index.ts` текущую инициализацию превратить в функцию, а клиентский синглтон оставить:

```ts
export const createI18n = (language: SupportedLanguage) => {
  const instance = i18n.createInstance();

  instance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (lng: string, namespace: string) =>
          import(`./locales/${lng}/${namespace}.json`)
      )
    )
    .init({
      lng: language,
      fallbackLng: 'en',
      ns: [
        'common',
        'connect',
        'disconnected',
        'sidebar',
        'topbar',
        'dialogs',
        'settings',
        'permissions',
        'audio'
      ],
      defaultNS: 'common',
      fallbackNS: 'common',
      interpolation: {
        escapeValue: false
      }
    });

  return instance;
};

export const i18n = createI18n(initialLanguage);
```

Событие `languageChanged` с записью в localStorage навесить только на клиентский синглтон, иначе серверный экземпляр начнёт писать в localStorage при каждом запросе.

- [x] **Step 3: Зафиксировать время рендера**

Создать `apps/client/src/helpers/render-clock.ts`:

```ts
import { createContext, useContext } from 'react';

const RenderClockContext = createContext<number | null>(null);

export const RenderClockProvider = ({
  children,
  now
}: {
  children: React.ReactNode;
  now: number;
}) => {
  return (
    <RenderClockContext.Provider value={now}>
      {children}
    </RenderClockContext.Provider>
  );
};

export const useRenderClock = () => {
  const fixedNow = useContext(RenderClockContext);

  return fixedNow ?? Date.now();
};
```

В `apps/client/src/components/relative-time/index.tsx` и `apps/client/src/components/reconnecting-overlay/use-countdown-seconds.ts` заменить `new Date()` и `Date.now()` на `useRenderClock()`.

- [x] **Step 4: Прогнать проверки и закоммитить**

Run: `cd apps/client && bun test src/i18n/__tests__/i18n.test.ts`
Expected: PASS, 2 теста.

Run: `cd apps/client && bun run check-types && bun run lint && bun run format:check`
Expected: exit 0.

```bash
git add apps/client/src
git commit -m "refactor: resolve the language and the clock per request"
```

---

### Task 9: Гарды браузерных API

Девять мест падают при импорте на сервере, семь падают во время рендера. После этой задачи дерево приложения можно импортировать и рендерить на сервере.

**Files:**
- Modify: `apps/client/src/helpers/voice-debug.ts`
- Modify: `apps/client/src/lib/trpc.ts`
- Modify: `apps/client/src/features/server/actions.ts`
- Modify: `apps/client/src/helpers/exposes.ts`
- Modify: `apps/client/src/features/server/plugins/plugin-store.ts`
- Modify: `apps/client/src/components/fullscreen-image/content.tsx`
- Modify: `apps/client/src/components/debug/store-debug.tsx`
- Modify: `apps/client/src/helpers/is-debug.ts`
- Modify: `apps/client/src/components/server-screens/index.tsx`
- Modify: `apps/client/src/components/left-sidebar/sidebar-dnd.tsx`
- Modify: `apps/client/src/components/server-screens/user-settings/others/themes.tsx`
- Modify: `apps/client/src/screens/connect/index.tsx`
- Modify: `apps/client/src/screens/connect/hooks/use-oidc-login.ts`
- Test: `apps/client/src/test-utils/ssr-render.tsx`

**Interfaces:**
- Consumes: `renderToStaticMarkup` из `react-dom/server`.
- Produces: `renderOnServer(element: ReactElement): string`, тестовая обёртка, которая импортирует дерево приложения в окружении без `window`.

- [x] **Step 1: Написать тест серверного рендера**

Создать `apps/client/src/test-utils/ssr-render.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';

export const renderOnServer = (element: ReactElement): string => {
  return renderToStaticMarkup(element);
};
```

Создать `apps/client/src/test-utils/__tests__/ssr-render.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { renderOnServer } from '../ssr-render';

describe('the server render', () => {
  test('renders the element without a browser', () => {
    const html = renderOnServer(<div>hello</div>);

    expect(html).toContain('hello');
  });
});
```

- [x] **Step 2: Закрыть модульные обращения к браузеру**

В `apps/client/src/helpers/voice-debug.ts` строки 319, 323 и 327 обернуть в проверку:

```ts
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    pushVoiceDebugEvent('ws', 'page: network online');
  });
}
```

Так же поступить в `apps/client/src/lib/trpc.ts:37`, `apps/client/src/features/server/actions.ts:298` и `:310`, `apps/client/src/helpers/exposes.ts` и `apps/client/src/features/server/plugins/plugin-store.ts:86`.

- [x] **Step 3: Починить полноэкранное изображение**

В `apps/client/src/components/fullscreen-image/content.tsx` убрать обращение к `document` из модульной области и найти корень портала в компоненте:

```tsx
const portalRoot = useRef<HTMLElement | null>(null);

useEffect(() => {
  portalRoot.current = document.getElementById('imagePortal');
}, []);
```

- [x] **Step 4: Починить отладочный вывод**

В `apps/client/src/helpers/is-debug.ts` строка 8 читает `window.DEBUG`. Заменить на безопасную проверку, а `apps/client/src/components/debug/store-debug.tsx` вызывает `logDebug` только когда отладка включена:

```ts
if (!isDebugEnabled()) {
  return null;
}
```

- [x] **Step 5: Починить порталы во время рендера**

В `apps/client/src/components/left-sidebar/sidebar-dnd.tsx:110` и `apps/client/src/components/server-screens/user-settings/others/themes.tsx:76` `createPortal(..., document.body)` вызывается во время рендера. Обернуть в `<ClientOnly>` из `@tanstack/react-router`, чтобы на сервере рендерился пустой узел.

В `apps/client/src/components/server-screens/index.tsx:38` `document.getElementById('portal')` перенести в `useEffect` с состоянием.

- [x] **Step 6: Починить экран подключения**

В `apps/client/src/screens/connect/index.tsx:103` `window.location.search` заменить на данные загрузчика роута, в `:309` `window.isSecureContext` заменить на признак из загрузчика.

В `apps/client/src/screens/connect/hooks/use-oidc-login.ts:21-23` чтение `window.location.hash` заменить на данные загрузчика.

- [x] **Step 7: Прогнать проверки и закоммитить**

Run: `cd apps/client && bun test src/test-utils/__tests__/ssr-render.test.ts`
Expected: PASS.

Run: `cd apps/client && bun run build`
Expected: пререндер проходит без ошибки `window is not defined`.

```bash
git add apps/client/src
git commit -m "refactor: guard the browser apis so the client renders on the server"
```

---

### Task 10: Экраны через TanStack Router

Самописный переключатель экранов уступает роутам. Это делает возможным серверный рендер: только роут знает, какой экран показать.

**Files:**
- Modify: `apps/client/src/routes/index.tsx`
- Create: `apps/client/src/routes/connect.tsx`
- Create: `apps/client/src/routes/app.tsx`
- Create: `apps/client/src/routes/disconnected.tsx`
- Modify: `apps/client/src/routes/__root.tsx`
- Modify: `apps/client/src/components/routing/index.tsx`
- Modify: `apps/client/src/components/routing/auto-login-controller.tsx`
- Test: `apps/client/src/routes/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: `useStore`, `createRouter` из `@tanstack/react-router`, `ClientOnly` из `@tanstack/react-router`.
- Produces: роуты `/`, `/connect`, `/app`, `/disconnected`.

- [x] **Step 1: Написать тест маршрутов**

Создать `apps/client/src/routes/__tests__/routes.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { routeTree } from '../../routeTree.gen';

describe('the routes', () => {
  test('has the connect, the app and the disconnected screens', () => {
    const paths = Object.keys(routeTree.childrenById ?? {});

    expect(paths).toContain('/connect');
    expect(paths).toContain('/app');
    expect(paths).toContain('/disconnected');
  });
});
```

- [x] **Step 2: Развести экраны по роутам**

Создать `apps/client/src/routes/app.tsx`:

```tsx
import { ClientOnly, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app')({
  component: () => (
    <ClientOnly>
      <ServerApp />
    </ClientOnly>
  )
});
```

`ServerApp` — это дерево, которое сейчас рендерит `apps/client/src/components/routing/index.tsx` для состояния «подключён к серверу».

Создать `apps/client/src/routes/disconnected.tsx` так же, но с экраном разрыва связи.

Изменить `apps/client/src/routes/index.tsx` на редирект:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/connect' });
  }
});
```

- [x] **Step 3: Перевести переключатель экранов на навигацию**

`apps/client/src/components/routing/index.tsx` больше не переключает экраны сам. Он наблюдает состояние стора и вызывает навигацию роутера:

```tsx
const navigate = useNavigate();

useEffect(() => {
  if (isConnected) {
    navigate({ to: '/app' });
  }
}, [isConnected, navigate]);
```

Убрать рендер экранов из этого компонента, оставив в нём только заголовок документа и авторедирект OIDC.

- [x] **Step 4: Обвязать корневой роут провайдерами**

В `apps/client/src/routes/__root.tsx` обернуть содержимое в `StoreProvider` и `I18nextProvider` из `react-i18next`, чтобы серверный экземпляр стора и языка доходил до всех экранов.

- [x] **Step 5: Прогнать проверки и закоммитить**

Сначала перегенерировать дерево роутов, иначе тест увидит старый файл:

Run: `cd apps/client && bun run build`
Expected: сборка проходит, в `src/routeTree.gen.ts` появились `/connect`, `/app`, `/disconnected`.

Run: `cd apps/client && bun test src/routes/__tests__/routes.test.ts`
Expected: PASS.

Run: `cd apps/client && bun test`
Expected: ни один тест не падает.

```bash
git add apps/client/src
git commit -m "refactor: route the screens through the tanstack router"
```

---

### Task 11: Тесты, сборка и гейты

Финальная проверка: prod-подобная сборка поднимается и обслуживает API, визуальные эталоны не трогаются, все гейты зелёные.

**Files:**
- Create: `apps/server/src/__tests__/start-server.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `apps/client/src/visual-tests/`

**Interfaces:**
- Consumes: собранный `apps/client/dist/server/server.js`.
- Produces: гейт в CI, который поднимает prod-подобный сервер и проверяет API.

- [x] **Step 1: Написать тест prod-подобного сервера**

Создать `apps/server/src/__tests__/start-server.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import path from 'path';

const bundlePath = path.resolve(
  import.meta.dir,
  '..',
  '..',
  '..',
  'client',
  'dist',
  'server',
  'server.js'
);

describe('the start server bundle', () => {
  test('answers the health check through the fetch handler', async () => {
    const mod = await import(bundlePath);
    const response = await mod.default.fetch(
      new Request('http://localhost/healthz')
    );

    expect(response.status).toBe(200);
  });
});
```

- [x] **Step 2: Добавить гейт в CI**

В `.github/workflows/ci.yml` в джоб `Build & Test` после шага `Build` добавить шаг, который поднимает собранный сервер и проверяет API:

```yaml
      - name: Build the client with the start server
        working-directory: apps/client
        run: bun run build

      - name: Check the start server bundle
        working-directory: apps/server
        run: bun test src/__tests__/start-server.test.ts
```

- [x] **Step 3: Прогнать полный набор проверок**

Run: `bun run format:check`
Expected: exit 0.

Run: `bun run check-types`
Expected: exit 0.

Run: `bun run lint`
Expected: exit 0.

Run: `bun run test`
Expected: exit 0.

Run: `cd apps/client && bun run test:visual`
Expected: падения только в местах, где менялась разметка; эталоны в этом PR не обновлять.

- [x] **Step 4: Проверить diff на посторонние изменения**

Run: `git diff origin/master --stat`
Expected: в изменённых файлах нет `apps/client/src/visual-tests/__screenshots__/`.

- [x] **Step 5: Закоммитить и открыть PR**

```bash
git add .github/workflows/ci.yml apps/server/src/__tests__ apps/client/src/visual-tests
git commit -m "test: cover the start server routes and the built bundle"
```

```bash
git push origin agent/tanstack-start-migration
gh pr create --repo dodecagon-mesh/dodecagon --base master --head agent/tanstack-start-migration --title "refactor: migrate the client and the http surface to tanstack start" --body "$(cat <<'EOF'
Полная миграция на TanStack Start по спеке `docs/superpowers/specs/2026-10-23-tanstack-start-migration-design.md`.

- Start-сервер живёт внутри Bun-процесса: `dist/server` пакуется в `server.zip`, вшивается в бинарник и распаковывается при старте.
- HTTP-поверхность переехала на server routes: `/info`, `/manifest.json`, `/login`, `/oidc/*`, `/plugin-components`, `/healthz`. Публичные URL и форматы ответов не изменились.
- `/upload`, `/public/*`, `/plugin-bundle/*`, `/plugins/*` и tRPC по WebSocket остались в Bun-ядре.
- Доступ server routes к БД и плагинам идёт через мост `TServerBridge` в `packages/shared`: один процесс, один экземпляр менеджера плагинов.
- Экраны переведены на роуты TanStack Router, приложение рендерится на сервере целиком.

EOF
)"
```

## Связи

- Спека: `docs/superpowers/specs/2026-10-23-tanstack-start-migration-design.md`
- Правила репозитория: `AGENTS.md`
- Workflow доставки: `concepts/dodecagon-task-delivery-and-baselines` в вики
