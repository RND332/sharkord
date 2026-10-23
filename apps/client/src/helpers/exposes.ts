import { createCachedSelector } from 're-reselect';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactJSXDev from 'react/jsx-dev-runtime';
import * as ReactJSX from 'react/jsx-runtime';
import { createSelector } from 'reselect';

const exposeLibs = () => {
  window.__DODECAGON_EXPOSED_LIBS__ = {
    createSelector,
    createCachedSelector
  };
};

const exposeReact = () => {
  window.__DODECAGON_REACT__ = React;
  window.__DODECAGON_REACT_JSX__ = ReactJSX;
  window.__DODECAGON_REACT_JSX_DEV__ = ReactJSXDev;
  window.__DODECAGON_REACT_DOM__ = ReactDOM;
  window.__DODECAGON_REACT_DOM_CLIENT__ = ReactDOMClient;
};

export { exposeLibs, exposeReact };
