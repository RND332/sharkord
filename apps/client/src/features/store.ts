import { useCallback, useRef, useSyncExternalStore } from 'react';
import {
  appInitialState,
  appSliceReducer,
  type TAppAction,
  type TAppState
} from './app/slice';
import {
  dialogInitialState,
  dialogSliceReducer,
  type TDialogAction,
  type TDialogState
} from './dialogs/slice';
import {
  serverScreenInitialState,
  serverScreenSliceReducer,
  type TServerScreenAction,
  type TServerScreenState
} from './server-screens/slice';
import {
  serverInitialState,
  serverSliceReducer,
  type IServerState,
  type TServerAction
} from './server/slice';
import { useStore } from './store-context';

export interface IRootState {
  app: TAppState;
  server: IServerState;
  dialog: TDialogState;
  serverScreen: TServerScreenState;
}

export type TRootAction =
  TAppAction | TDialogAction | TServerAction | TServerScreenAction;

export interface IStore {
  getState(): IRootState;
  dispatch(action: TRootAction): void;
  subscribe(listener: () => void): () => void;
  setState(nextState: Partial<IRootState>): void;
}

const isAppAction = (action: TRootAction): action is TAppAction =>
  action.type.startsWith('app/');
const isDialogAction = (action: TRootAction): action is TDialogAction =>
  action.type.startsWith('dialog/');
const isServerAction = (action: TRootAction): action is TServerAction =>
  action.type.startsWith('server/');
const isServerScreenAction = (
  action: TRootAction
): action is TServerScreenAction => action.type.startsWith('serverScreen/');

const rootReducer = (
  currentState: IRootState,
  action: TRootAction
): IRootState => {
  const app = isAppAction(action)
    ? appSliceReducer(currentState.app, action)
    : currentState.app;
  const server = isServerAction(action)
    ? serverSliceReducer(currentState.server, action)
    : currentState.server;
  const dialog = isDialogAction(action)
    ? dialogSliceReducer(currentState.dialog, action)
    : currentState.dialog;
  const serverScreen = isServerScreenAction(action)
    ? serverScreenSliceReducer(currentState.serverScreen, action)
    : currentState.serverScreen;

  if (
    app === currentState.app &&
    server === currentState.server &&
    dialog === currentState.dialog &&
    serverScreen === currentState.serverScreen
  ) {
    return currentState;
  }

  return { app, server, dialog, serverScreen };
};

// every request on the server gets its own instance, so the state of one
// request never leaks into another one
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

// the code that runs outside of React reads the client instance
export const store = createStore();

// the render tests put the state they need into the store directly
export const setStoreState = (nextState: Partial<IRootState>) => {
  store.setState(nextState);
};

// the selector reads the state the component needs, the component only
// re-renders when that value changes
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

  return useSyncExternalStore(currentStore.subscribe, getSnapshot, getSnapshot);
};
