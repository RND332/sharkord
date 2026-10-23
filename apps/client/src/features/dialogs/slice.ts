import type { Dialog } from '@/components/dialogs/dialogs';
import type { TGenericObject } from '@dodecagon/shared';
import { produce } from 'immer';

export type TDialogState = {
  openDialog: Dialog | undefined;
  props: TGenericObject;
  isOpen: boolean;
};

const initialState: TDialogState = {
  openDialog: undefined,
  props: {},
  isOpen: false
};

const dialogSliceActions = {
  resetDialogs: () => ({ type: 'dialog/resetDialogs' }) as const,
  openDialog: (payload: { dialog: Dialog; props?: TGenericObject }) =>
    ({ type: 'dialog/openDialog', payload }) as const,
  closeDialogs: () => ({ type: 'dialog/closeDialogs' }) as const
};

export type TDialogAction = ReturnType<
  (typeof dialogSliceActions)[keyof typeof dialogSliceActions]
>;

const dialogSliceReducer = (
  state: TDialogState,
  action: TDialogAction
): TDialogState => {
  if (action.type === 'dialog/resetDialogs') {
    return initialState;
  }

  return produce(state, (draft) => {
    switch (action.type) {
      case 'dialog/openDialog':
        draft.openDialog = action.payload.dialog;
        draft.props = action.payload.props || {};
        draft.isOpen = true;
        break;
      case 'dialog/closeDialogs':
        draft.openDialog = undefined;
        draft.props = {};
        draft.isOpen = false;
        break;
    }
  });
};

export {
  initialState as dialogInitialState,
  dialogSliceActions,
  dialogSliceReducer
};
