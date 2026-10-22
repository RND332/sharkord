import type { TIconComponent } from '@dodecagon/ui';
import type { ReactNode } from 'react';

export type TSettingsEntry = {
  id: string;
  label: string;
  icon: TIconComponent;
  content: ReactNode;
  logo?: string;
  error?: string;
};
