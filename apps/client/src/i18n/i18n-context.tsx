import type { i18n as TI18nInstance } from 'i18next';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

// the language belongs to the request on the server, so the instance travels
// through the tree instead of being a module level singleton
export const I18nProvider = ({
  children,
  value
}: {
  children: ReactNode;
  value: TI18nInstance;
}) => {
  return <I18nextProvider i18n={value}>{children}</I18nextProvider>;
};
