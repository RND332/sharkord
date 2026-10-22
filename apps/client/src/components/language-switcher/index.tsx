import { SUPPORTED_LANGUAGES } from '@/i18n';
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@dodecagon/ui';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TLanguageSwitcherProps = {
  variant?: 'icon' | 'full';
  className?: string;
};

const LanguageSwitcher = memo(
  ({ variant = 'full', className }: TLanguageSwitcherProps) => {
    const { i18n } = useTranslation();

    const handleChange = useCallback(
      (value: string) => {
        i18n.changeLanguage(value);
      },
      [i18n]
    );

    return (
      <Select value={i18n.language} onValueChange={handleChange}>
        <SelectTrigger
          size="sm"
          className={cn(
            'w-auto gap-2',
            variant === 'full' && 'w-36',
            className
          )}
        >
          {variant === 'icon' && <LanguageIcon className="h-4 w-4 shrink-0" />}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

export { LanguageSwitcher };
