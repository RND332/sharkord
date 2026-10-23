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

  test('leaves the subscribers alone when the state does not change', () => {
    const store = createStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });

    store.dispatch({ type: 'app/setAppLoading', payload: true });

    expect(calls).toBe(0);
  });
});
