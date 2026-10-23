import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export const renderOnServer = (element: ReactElement): string => {
  return renderToStaticMarkup(element);
};
