import { getLocalStorageItem, LocalStorageKey } from './storage';

const OVERRIDE_DEBUG = false;

const localStorageDebug = getLocalStorageItem(LocalStorageKey.DEBUG);

const isDebug = () => {
  // the server renders the app too and it has no window to read the flag from
  if (typeof window === 'undefined') {
    return OVERRIDE_DEBUG;
  }

  return !!window.DEBUG || OVERRIDE_DEBUG || !!localStorageDebug;
};

export { isDebug };
