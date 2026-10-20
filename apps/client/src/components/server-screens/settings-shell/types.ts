import type { TIconComponent } from '@sharkord/ui';
import type { ReactNode } from 'react';

export type TSettingsEntry = {
  id: string;
  label: string;
  icon: TIconComponent;
  content: ReactNode;
  logo?: string;
  error?: string;
};
