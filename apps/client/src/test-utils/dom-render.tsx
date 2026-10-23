// The base ui portals mount their content into the dom after the layout
// effects run, the server renderer drops it. The render helpers mount the
// tree into a happy dom window and read the markup from the document body.
import { Window } from 'happy-dom';
import type { ReactNode } from 'react';

// the window stands for the app origin, the helpers that build a url from
// the location need it
const window = new Window({ url: 'https://discord.rnd332.com' });

const defineGlobal = (key: string, value: unknown) => {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
};

defineGlobal('window', window);
defineGlobal('document', window.document);
defineGlobal('navigator', window.navigator);
defineGlobal('getComputedStyle', window.getComputedStyle.bind(window));
defineGlobal(
  'requestAnimationFrame',
  window.requestAnimationFrame.bind(window)
);
defineGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
defineGlobal('ResizeObserver', window.ResizeObserver);
defineGlobal('IntersectionObserver', window.IntersectionObserver);
defineGlobal('matchMedia', window.matchMedia.bind(window));

// the react tree expects the dom classes of the window as globals
const domClasses = [
  'CustomEvent',
  'DOMRect',
  'DocumentFragment',
  'Element',
  'Event',
  'EventTarget',
  'FocusEvent',
  'HTMLElement',
  'InputEvent',
  'KeyboardEvent',
  'MouseEvent',
  'MutationObserver',
  'Node',
  'NodeFilter',
  'NodeList',
  'PointerEvent',
  'ShadowRoot',
  'SVGElement',
  'TreeWalker',
  'UIEvent',
  'getSelection'
];

for (const key of domClasses) {
  const value = (window as unknown as Record<string, unknown>)[key];

  if (value) {
    defineGlobal(key, value);
  }
}

// the element constructors of the window, the radix primitives check the
// nodes they focus against them
for (const key of Object.getOwnPropertyNames(window)) {
  if (key.startsWith('HTML')) {
    defineGlobal(key, (window as unknown as Record<string, unknown>)[key]);
  }
}

// the react dom client reads the dom when it loads, so it is imported after
// the globals above are in place
export const renderInDom = async (
  element: ReactNode,
  beforeRead?: () => void | Promise<void>
) => {
  const { createRoot } = await import('react-dom/client');

  // the global document is the one of the window, the types of the dom lib
  // are the ones react expects
  const container = document.createElement('div');

  document.body.append(container);

  const root = createRoot(container);

  root.render(element);

  await new Promise((resolve) => setTimeout(resolve, 50));

  // a tree that only shows its content after an interaction opens it here,
  // the markup is read once the interaction has been handled
  if (beforeRead) {
    await beforeRead();

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const markup = document.body.innerHTML;

  root.unmount();
  container.remove();

  return markup;
};
