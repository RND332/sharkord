# Dodecagon: миграция на TanStack Start

- Дата: 2026-10-23
- Ветка: `agent/tanstack-start-migration`
- Основание: `origin/master` (`552e34ee`)
- Статус: дизайн согласован, готов к реализации

## 1. Контекст

Клиент формально зависит от TanStack Start, но ни один механизм Start не работает.

Проверено на текущем `master`:

- `apps/client/package.json`: `@tanstack/react-start@^1.168.61`, `@tanstack/react-router@^1.170.42`.
  Актуальные на npm: `1.169.4` и `1.170.46`. Отставание в пол-патча, апгрейд для этой задачи не нужен.
- `apps/client/vite.config.ts` включает `tanstackStart({ prerender })` и пререндерит только `/`.
- `apps/client/src/routes/`: `__root.tsx` (оболочка документа с `HeadContent` и `Scripts`) и `index.tsx`.
- `apps/client/src/routes/index.tsx:9-17` рендерит `ClientOnlyApp`: `useEffect` плюс `import('../main')`.
  На сервере `useEffect` не выполняется, поэтому пререндер отдаёт пустую оболочку.
- Собранный `apps/client/dist/client/index.html` весит 2.2 КБ и содержит только
  `<div id="portal">`, `<div id="imagePortal">` и скрипты роутера. Разметки приложения в нём нет.
- `apps/client/dist/server/server.js` (240 КБ плюс чанки) собирается и выбрасывается:
  `apps/server/build/build.ts:73-79` пакует в релиз только `dist/client`.
- `createStart` не реализован. `apps/client/src/routeTree.gen.ts:62-65` объявляет
  `Register { ssr: true; router }`, но этот тип никто не экспортирует: аугментация висит в пустоту.
- Server routes, server functions, загрузчики роутов: ни одного.
- Экраны переключает самописный `apps/client/src/components/routing/index.tsx` по состоянию стора.
- `apps/server/src/http/` — самописный HTTP-слой на Node `http.createServer`
  (`apps/server/src/http/index.ts:105-110`), поверх того же сервера висит `ws`
  (`apps/server/src/utils/wss.ts:257`).
- tRPC смонтирован только по WebSocket (`applyWSSHandler` в `apps/server/src/utils/wss.ts:283-292`),
  без префикса пути: `WebSocketServer` создан без `path`, поэтому апгрейд принимается на любом пути.
- Сервер собирается в один исполняемый файл Bun (`apps/server/build/helpers.ts:220-241`),
  внутрь которого вшиты `interface.zip`, `drizzle.zip` и mediasoup worker.

Итог: приложение остаётся SPA, у которого есть плагин Start, собранный и неиспользуемый
бандл Start-сервера и один пустой роут.

## 2. Цели

1. Приложение работает как настоящее TanStack Start-приложение: свой Start-сервер в рантайме,
   роуты, server routes, server functions, загрузчики.
2. HTTP-поверхность переезжает с самописного слоя `apps/server/src/http` на server routes Start.
3. Bun-сервер остаётся владельцем tRPC, WebSocket, mediasoup, менеджера плагинов и файлового стриминга.
4. Приложение рендерится на сервере целиком: отдаваемый HTML перестаёт быть пустой оболочкой.
5. Публичные URL не меняются: `/login`, `/info`, `/manifest.json`, `/healthz`, `/oidc/login`,
   `/oidc/callback`, `/oidc/exchange`, `/oidc/backchannel-logout`, `/plugin-components`,
   `/upload`, `/public/*`, `/plugin-bundle/*`, `/plugins/*` остаются как есть.

## 3. Не-цели

- Перенос tRPC с WebSocket на HTTP, перенос голоса, вынос плагинов в отдельные процессы.
- Смена публичных URL и контрактов API, на которые завязаны десктопный клиент, OIDC-конфигурация
  провайдера, плагины и документация.
- Рефакторинг UI, дизайна и поведения экранов.
- Апгрейд TanStack и переезд с Radix-подобных API на новые: версии и так свежие.

## 4. Целевая архитектура

```
Bun-процесс (один скомпилированный бинарник, как сейчас)
├── apps/server core
│     db, pluginManager, mediasoup, tRPC router, ws, cron, pubsub, updater   [без изменений]
├── TanStack Start server
│     src/routes/**            UI-роуты, server routes, server functions
│     dist/server/server.js    собранный бандл Start, вшит в бинарник и распаковывается при старте
│       ├── SSR приложения
│       ├── server routes      /info, /manifest.json, /login, /oidc/*, /plugin-components, /healthz
│       └── server functions   getServerInfo(), getPluginComponents()
└── HTTP-диспетчер (Node http.createServer плюс ws, как сейчас)
      ├── WS-upgrade            tRPC, без изменений
      ├── пути Start           startHandler.fetch(request)
      └── пути Bun              существующие хендлеры
```

Схема описывает релизный режим. В разработке API-пути остаются за Bun-сервером,
разница разобрана в разделе 4.8.

### 4.1 Разделение HTTP-поверхности

| Путь | Куда уезжает | Почему |
| --- | --- | --- |
| `GET /` | Start, SSR | отдаёт документ приложения |
| `GET /info` | Start server route | чтение БД, без состояния процесса |
| `GET /manifest.json` | Start server route | чтение БД плюс размер логотипа |
| `GET /healthz` | Start server route | тривиально |
| `POST /login` | Start server route | БД, инвайты, хук плагина `beforeLogin`, лимитер |
| `GET /oidc/login` | Start server route | транзакция в БД, state-cookie, редирект |
| `GET /oidc/callback` | Start server route | обмен кода, handoff в БД, редирект с `#oidc=` |
| `POST /oidc/exchange` | Start server route | handoff в БД, очистка state-cookie |
| `POST /oidc/backchannel-logout` | Start server route | проверка JWT, `disconnectUser` через мост |
| `GET /plugin-components` | Start server route | список плагинов из менеджера плагинов |
| `POST /upload` | остаётся в Bun | потоковая запись на диск, прогресс, временный файл |
| `GET /public/*` | остаётся в Bun | стриминг с Range и ETag, подписанные URL |
| `GET /plugin-bundle/*` | остаётся в Bun | чтение клиентских бандлов плагинов с диска |
| `GET /plugins/:id/*` | остаётся в Bun | обработчики плагинов это функции в памяти процесса |
| WS `/` | остаётся в Bun | tRPC, отдельный протокол, апгрейд перехватывается `ws` |
| `/assets/*`, `/favicon.ico` | остаётся в Bun | статика с диска из `INTERFACE_PATH` |

Ограничение, которое определило это разделение: обработчики `GET /plugins/:id/*` и хук
`beforeLogin` живут в памяти менеджера плагинов. Их нельзя вынести ни в отдельный процесс,
ни в отдельный экземпляр менеджера, иначе плагины загрузятся дважды и их состояние разойдётся.

### 4.2 Мост доступа к состоянию сервера

Start-сервер и Bun-ядро собираются разными инструментами: первый это Vite-бандл, второй
`Bun.build` с `compile`. Чтобы server routes видели то же самое состояние, что и ядро,
нужен общий мост.

Отклонённые варианты:

- Отдельный процесс. Плагины и сокеты не переживают раздвоение процесса, а второй процесс
  открыл бы второе соединение с той же SQLite.
- Встраивание общего ядра в Start-бандл. Получились бы второй `bun:sqlite` и второй
  `pluginManager`: плагины загрузились бы дважды, `beforeLogin` и HTTP-роуты плагинов
  оказались бы в другом экземпляре.

Выбранный вариант: **мост на ссылках через общий пакет.**

`packages/shared/src/server-bridge.ts` объявляет узкий интерфейс с функциями, а не с
сылками на БД:

```ts
export interface TRequestContext {
  origin: string;
  ip?: string;
  secure?: boolean;
  cookie?: string;
}

export interface TServerBridge {
  getServerInfo(): Promise<TServerInfo>;
  authenticateUser(
    input: TLoginInput,
    context?: TRequestContext
  ): Promise<TLoginResult>;
  createOidcLogin(context: TRequestContext): Promise<TOidcLoginResult>;
  consumeOidcCallback(
    input: TOidcCallbackInput,
    context: TRequestContext
  ): Promise<TOidcCallbackResult>;
  consumeOidcHandoff(
    code: string,
    context: TRequestContext
  ): Promise<TOidcHandoffResult>;
  verifyBackchannelLogout(
    token: string,
    context: TRequestContext
  ): Promise<TOidcLogoutResult>;
  listPluginComponentIds(): Promise<string[]>;
}
```

`TRequestContext` несёт то, что сервисы не могут вычислить сами: где сервер считает, что
живёт, кто звонит и что прислал браузер. Без него не воспроизводятся проверка state-cookie,
`redirect_uri`, атрибут `Secure` у cookie и оба ограничителя частоты.

Таксономия ошибок переезжает в `packages/shared` вместе с мостом: сейчас она живёт в
`apps/server/src/http/helpers.ts` и размазана между хендлерами. Иначе server route в
`apps/client` не смогла бы собрать тот же ответ, что и Bun-хендлер. В общий пакет уходят
типы результатов и ошибок (`TLoginResult`, `THttpError` с полями формы, `TPayloadTooLarge`),
а также функция `toHttpResponse`, которая превращает результат в `Response`.

Bun-ядро реализует интерфейс один раз, при старте, и кладёт реализацию в мост.
Start-бандл читает её через `getServerBridge()`. Мост живёт в том же процессе, поэтому
`db`, `pluginManager` и `fileManager` у обоих одни и те же объекты.

Start-бандл и Bun-ядро собираются разными инструментами, поэтому в Start-бандле лежит своя
копия `packages/shared`. Модульная переменная в такой копии не связала бы ядро и роуты: у
них было бы два разных моста. Поэтому реализация лежит в реестре процесса, под ключом из
глобального реестра символов (`Symbol.for`). Один ключ даёт одну ячейку в одном процессе,
поэтому ядро и server routes читают и пишут один мост, хотя у них разные экземпляры
пакета.

Логика, которая сегодня живёт в теле хендлеров `apps/server/src/http/*.ts`, переносится в
переиспользуемые функции `apps/server/src/helpers/`, а хендлеры и server routes становятся
тонкими адаптерами над ними. Функции, которые остаются в Bun (`/upload`, `/public/*`,
`/plugins/:id/*`), продолжают использовать те же хелперы напрямую.

Мост инициализируется до первого запроса: порядок загрузки в `apps/server/src/index.ts`
не меняется, точка установки моста добавляется рядом с инициализацией плагинов.

### 4.3 Маршруты и экраны

Самописный переключатель экранов уступает роутам TanStack Router:

| Роут | Что рендерит | Рендер на сервере |
| --- | --- | --- |
| `/` | редирект на `/connect` | да |
| `/connect` | экран подключения | да, с реальными данными |
| `/app` | авторизованное приложение | нет, только клиент |
| `/disconnected` | экран разрыва связи | нет, только клиент |

Экран `/connect` читает данные из загрузчика роута, а не из стора. Все, что читается из
`window.location` (код инвайта, хендофф OIDC) и из `window.isSecureContext`, приходит из
запроса: загрузчик отдаёт `search`, `hash` и признак защищённого соединения.

Переходы между `/connect` и `/app` делает навигация роутера: после успешного входа
`startSession()` вызывает переход, после потери связи клиент уходит на `/disconnected`.

### 4.4 Server routes

Файлы server routes лежат в `apps/client/src/routes/` рядом с UI-роутами. Обработчик
возвращает Web `Response`:

```ts
export const Route = createFileRoute('/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bridge = getServerBridge();
        const input = await request.json();

        return toHttpResponse(await bridge.authenticateUser(input));
      }
    }
  }
});
```

Проверено на установленной версии:

- `server: { handlers }` есть в `@tanstack/start-client-core@1.170.12`, модульная аугментация
  добавляет поле `server` в опции роута.
- Обработчики server route попадают только в `dist/server` и не попадают в клиентский бандл.
- Путь с точкой получается через экранированное имя файла: `routes/manifest[.]json.ts`
  даёт путь `/manifest.json`.

Контракты ответов, коды ошибок, заголовки и формы тела ошибок сохраняются один в один:
клиент, десктопное приложение и OIDC-провайдер завязаны на них.

### 4.5 Server functions

`fetchServerInfo` из `apps/client/src/features/app/actions.ts:68-83` становится server
function: клиент зовёт её напрямую, без ручного `fetch` и без абсолютного origin.
То же для списка компонентов плагинов, который сейчас тянется через
`GET /plugin-components` из `apps/client/src/components/plugins-controller/index.tsx:12-21`.

### 4.6 SSR всего приложения

Приложение рендерится на сервере целиком. Данные авторизованной части приходят по
WebSocket и на сервере недоступны, поэтому серверный рендер авторизованного приложения
показывает состояние загрузки, а содержимое появляется после подключения клиента.
Полезная часть SSR: корректная тема, язык, шрифты и первая отрисовка без белого экрана,
плюс настоящий экран подключения с данными сервера.

Чтобы это работало, состояние должно быть привязано к запросу.

**Стор на запрос.** `apps/client/src/features/store.ts` сейчас это модульный синглтон.
На сервере такой синглтон общий для всех запросов, поэтому состояние запроса может
утечь в другой запрос. Стор становится фабрикой: `createStore()` возвращает экземпляр,
`StoreProvider` кладёт его в React-контекст, `useStoreSelector` читает экземпляр из
контекста. На клиенте провайдер отдаёт синглтон, поведение не меняется. На сервере
запрос получает свой экземпляр.

**Чтения localStorage в `initialState`.** Сейчас `apps/client/src/features/app/slice.ts:48-96`
и `apps/client/src/features/server/slice.ts:132-145` читают localStorage в модульной области,
то есть на сервере стор стартует с браузерных значений. Эти чтения переезжают в действие,
которое клиент выполняет после гидрации. Побочный эффект: до гидрации действуют значения
по умолчанию, а не сохранённые. Это единственный способ получить одинаковый первый рендер
на сервере и на клиенте.

**i18n на запрос.** `apps/client/src/i18n/index.ts` держит модульный синглтон i18next.
На сервере язык фиксируется в момент импорта, из-за этого любой клиент с другим языком
получил бы расхождение на каждой переведённой строке. На сервере создаётся экземпляр на
запрос, язык берётся из запроса. На клиенте первый рендер использует язык, который прислал
сервер, а сохранённый в localStorage язык применяется после гидрации.

**Время и случайность.** `relative-time` считает `new Date()` во время рендера, обратный
отсчёт использует `Date.now()`, реакции в голосе используют `Math.random()`. Значения
различаются между сервером и клиентом. Время берётся из загрузчика роута и фиксируется
до конца гидрации, случайность выводится детерминированно из идентификатора реакции и
идентификатора запроса.

**Браузерные поддеревья.** Всё, что работает только в браузере, оборачивается в
`ClientOnly` или переносится в эффект: `createPortal` в `sidebar-dnd.tsx:110` и
`themes.tsx:76`, `document.getElementById('portal')` в `server-screens/index.tsx:38`,
`document.getElementById('imagePortal')` в `fullscreen-image/content.tsx:10`.

**Блокеры по модульной области.** Девять мест падают при импорте на сервере, все закрываются
проверкой `typeof window`:

| Файл | Строки |
| --- | --- |
| `src/helpers/voice-debug.ts` | 319, 323, 327 |
| `src/lib/trpc.ts` | 37 |
| `src/features/server/actions.ts` | 298, 310 |
| `src/helpers/exposes.ts` | 10, 17-21 |
| `src/features/server/plugins/plugin-store.ts` | 86 |
| `src/components/fullscreen-image/content.tsx` | 10 |
| `src/components/debug/store-debug.tsx` | 7 |

**Блокеры по рендеру.** Двадцать одно место, из них семь падают с `ReferenceError`:
`store-debug.tsx:7`, `screens/connect/index.tsx:103` и `:309`,
`use-oidc-login.ts:21-23`, `server-screens/index.tsx:38`, `sidebar-dnd.tsx:110`,
`themes.tsx:76`.

Остальные четырнадцать дают расхождение сервер и клиент, то есть тихую ошибку гидрации:

| Место | Что расходится |
| --- | --- |
| `src/i18n/index.ts:49-51` | язык: сервер фиксирует `en`, клиент берёт свой |
| `src/components/theme-provider/index.tsx:22,37` | тема: сервер отдаёт `dark`, клиент своё значение |
| `src/components/devices-provider/index.tsx:174-176` | настройки устройств из localStorage |
| `src/screens/server-view/index.tsx:29-31` | состояние правой панели |
| `src/components/server-screens/user-settings/devices/index.tsx:145-158` | доступность шумового подавления и своих устройств |
| `src/components/emoji-picker/use-recent-emojis.ts:76-80` | недавние эмодзи из localStorage |
| `src/components/dialogs/keyboard-shortcuts/index.tsx:24` | `navigator.platform`: `⌘` против `Ctrl` |
| `src/helpers/get-file-url.ts:10,18-19` | origin: на сервере его нет, нужен origin из запроса |
| `src/features/store.ts:139` | снимок стора, который наполнен браузерными значениями |
| `src/components/relative-time/index.tsx:22-32` | `new Date()` во время рендера |
| `src/components/reconnecting-overlay/use-countdown-seconds.ts:6` | `Date.now()` во время рендера |
| `src/components/channel-view/voice/voice-reactions.tsx:9,16` | `Math.random()` во время рендера |
| `src/components/dialogs/create-invite-dialog/index.tsx:68,194` | `Date.now()` во время рендера |
| `src/components/server-screens/server-settings/invites/table-invite.tsx:34` | `Date.now()` во время рендера |

### 4.7 Сборка и релиз

- `apps/client` собирает `dist/client` и `dist/server`. Статический пререндер отключается:
  документ рендерится Start-сервером на каждый запрос.
- `apps/server/build/build.ts` дополнительно пакует `dist/server` в `server.zip`.
- `apps/server/build/helpers.ts` вшивает `server.zip` в бинарник рядом с `interface.zip`.
- При старте `apps/server/src/helpers/embeds.ts` распаковывает `server.zip` в `DATA_PATH`
  и `apps/server/src/index.ts` импортирует распакованный `server.js` и берёт его `fetch`.
- Статика клиента продолжает отдаваться с диска из `INTERFACE_PATH`.

Сборка сервера не меняет способ доставки: по-прежнему один исполняемый файл на цель,
`docker-entrypoint.sh` и `ENTRYPOINT` без изменений.

### 4.8 Разработка и деплой

Здесь есть развилка, которую нельзя замазать.

В разработке `bun dev` поднимает Vite на 5173 и Bun-сервер на 4991. UI отдаёт Vite,
API отдаёт Bun-сервер: клиент в разработке ходит за данными по абсолютному origin
`http://localhost:4991` (`apps/client/src/helpers/get-file-url.ts:5-11`), и e2e так же
поднимает оба процесса (`packages/e2e/playwright.config.ts:26-45`).

Start-сервер в разработке живёт в процессе Vite, а мост доступа к БД и плагинам
существует только в процессе Bun-сервера. Значит server routes в разработке не могут
обслуживаться, если только Bun-сервер не отдаст их сам.

Отсюда решение:

- **В разработке API-пути обслуживает Bun-сервер.** Его адаптеры остаются и вызывают
  те же сервисные функции, что и server routes.
- **В релизе API-пути обслуживает Start-сервер** внутри бинарника, через мост.
- Логика одна и та же: сервисные функции в `apps/server/src/helpers/`. Расходятся только
  адаптеры, которые переводят результат в ответ.

Цена этого решения: e2e в текущем виде проверяет Bun-адаптеры, а не server routes.
Чтобы prod-путь не остался непроверенным, добавляется проверка prod-подобного сборки:
собранный сервер поднимается, и по нему прогоняется набор API-тестов и смоук интерфейса.

Альтернатива, которую отвергли: гонять в разработке Start-сервер отдельным процессом с
мостом, который ходит в Bun-сервер по внутреннему HTTP. Это вторая реализация той же
поверхности и удвоенный проброс cookie и лимитов.

Тот же порт и тот же протокол в обоих режимах: WS-апгрейд перехватывается `ws` до
диспетчера, обычные GET и POST разбираются по таблице путей.

## 5. Проверки

### 5.1 Обязательные гейты

`bun run format:check`, `bun run check-types`, `bun run lint`, `bun run test` из корня,
как требует `AGENTS.md`. Плюс `bun run test:visual` в `apps/client`, если меняется разметка.

### 5.2 Что добавляется

- Тесты server routes: каждый путь проверяется на успех, на ошибку валидации и на
  отсутствие авторизации, по образцу `AGENTS.md` раздела «Route test coverage».
  Обработчик проверяется прямым вызовом с подставным мостом, поэтому тест живёт в
  `apps/client` и не тянет за собой `apps/server`.
- Тесты сервисных функций в `apps/server`: те же сценарии на настоящей реализации.
- Тест моста: Bun-ядро и Start-роут видят один и тот же экземпляр менеджера плагинов.
- Тест гидрации: серверный HTML и первый клиентский рендер совпадают для `/connect`
  и для `/app`.
- Тест публичных URL: `/login`, `/info`, `/manifest.json`, `/healthz`, `/oidc/*`
  отвечают теми же кодами и теми же телами, что до миграции.
- Prod-подобная проверка: собранный сервер поднимается на отдельном порту, по нему
  проходят API-тесты и смоук первой отрисовки интерфейса. Это единственный способ
  накрыть server routes, потому что e2e в текущем виде ходит по Bun-адаптерам.

### 5.3 Сверка снимков

Визуальные эталоны меняются, потому что меняется разметка экрана подключения и оболочки.
Эталоны обновляются отдельным PR после слияния задачного, как принято для пачек задач.

## 6. Риски и откат

| Риск | Что делаем |
| --- | --- |
| Расхождение сервер и клиент при гидрации | Фиксируем время и язык из загрузчика, тест сверки HTML и первого рендера |
| Утечка состояния между запросами | Стор становится фабрикой, экземпляр на запрос, тест на параллельные запросы |
| Двойная загрузка плагинов | Мост отдаёт ссылку на единственный экземпляр менеджера плагинов |
| WS-апгрейд перестаёт доходить до tRPC | Апгрейд перехватывается `ws` до диспетчера, тест подключения tRPC |
| Внешние потребители публичных URL | Контракты ответов сохраняются один в один, тест на формы тел |
| Сбой SSR ломает отдачу интерфейса | Диспетчер отдаёт клиентский статический `index.html`, если Start-сервер не поднялся |

Откат: задача уезжает одним PR, откат это revert одного PR. Промежуточных состояний
на проде не возникает, потому что релиз выходит после слияния.

## 7. Порядок коммитов

Один PR, одна ветка, последовательность коммитов, каждый из которых собирается. Полный
расклад по шагам лежит в плане `docs/superpowers/plans/2026-10-23-tanstack-start-migration.md`.

1. `refactor: add the server bridge and the shared service functions`
2. `feat: run the tanstack start server inside the bun process`
3. `feat: route the interface and the api paths through the start server`
4. `feat: serve the server info and the manifest from the start server`
5. `feat: serve the login and the oidc flow from the start server`
6. `feat: add the server functions and the connect loader`
7. `refactor: give the store an instance per request`
8. `refactor: resolve the language and the clock per request`
9. `refactor: guard the browser apis so the client renders on the server`
10. `refactor: route the screens through the tanstack router`
11. `test: cover the start server routes and the built bundle`

Порядок не совпадает с порядком «снизу вверх»: сначала мост и упаковка, потом
поверхность API, потом состояние на запрос, и только потом экраны. Так каждый
промежуточный коммит оставляет работающее приложение, а не сломанное.

## 8. Что остаётся открытым

- Точный набор маршрутов, которые остаются в Bun, может уменьшиться, если выяснится, что
  `/plugin-bundle/*` и `/public/*` выгоднее отдать Start-серверу. На старте они остаются в Bun,
  потому что отдают файлы с диска и держат подписанные URL.
- Порядок инициализации моста относительно загрузки плагинов: сейчас предполагается, что
  мост ставится сразу после `pluginManager.init()` и до `createServers()`.
