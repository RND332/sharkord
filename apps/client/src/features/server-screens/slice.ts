import type { ServerScreen } from '@/components/server-screens/screens';
import type { TGenericObject } from '@dodecagon/shared';
import { produce } from 'immer';

export type TServerScreenState = {
  openServerScreen: ServerScreen | undefined;
  props?: TGenericObject;
  isOpen: boolean;
};

const initialState: TServerScreenState = {
  openServerScreen: undefined,
  props: {},
  isOpen: false
};

const serverScreenSliceActions = {
  resetServerScreens: () =>
    ({ type: 'serverScreen/resetServerScreens' }) as const,
  openServerScreen: (payload: {
    serverScreen: ServerScreen;
    props?: TGenericObject;
  }) => ({ type: 'serverScreen/openServerScreen', payload }) as const,
  closeServerScreens: () =>
    ({ type: 'serverScreen/closeServerScreens' }) as const
};

export type TServerScreenAction = ReturnType<
  (typeof serverScreenSliceActions)[keyof typeof serverScreenSliceActions]
>;

const serverScreenSliceReducer = (
  state: TServerScreenState,
  action: TServerScreenAction
): TServerScreenState => {
  if (action.type === 'serverScreen/resetServerScreens') {
    return initialState;
  }

  return produce(state, (draft) => {
    switch (action.type) {
      case 'serverScreen/openServerScreen':
        draft.openServerScreen = action.payload.serverScreen;
        draft.props = action.payload.props || {};
        draft.isOpen = true;
        break;
      case 'serverScreen/closeServerScreens':
        draft.openServerScreen = undefined;
        draft.props = {};
        draft.isOpen = false;
        break;
    }
  });
};

export {
  initialState as serverScreenInitialState,
  serverScreenSliceActions,
  serverScreenSliceReducer
};
