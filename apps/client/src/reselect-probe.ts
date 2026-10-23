import { createSelector } from 'reselect';

type TState = { a: number };

const a = (state: TState) => state.a;

export const b = createSelector([a], (value) => value + 1);
