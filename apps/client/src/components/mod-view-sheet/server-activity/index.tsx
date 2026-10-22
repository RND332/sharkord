import { Card, CardContent, CardHeader, CardTitle } from '@dodecagon/ui';
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  DocumentIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ModViewScreen, useModViewContext } from '../context';

const ServerActivity = memo(() => {
  const { t } = useTranslation('settings');
  const { files, messages, links, setView } = useModViewContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5" />
          {t('serverActivityTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/30 rounded cursor-pointer"
          onClick={() => setView(ModViewScreen.MESSAGES)}
        >
          <div className="flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('serverActivityMessages')}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {messages.length}
          </span>
        </div>

        <div
          className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/30 rounded cursor-pointer"
          onClick={() => setView(ModViewScreen.LINKS)}
        >
          <div className="flex items-center gap-3">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('serverActivityLinks')}</span>
          </div>
          <span className="text-sm text-muted-foreground">{links.length}</span>
        </div>

        <div
          className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/30 rounded cursor-pointer"
          onClick={() => setView(ModViewScreen.FILES)}
        >
          <div className="flex items-center gap-3">
            <DocumentIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('serverActivityFiles')}</span>
          </div>
          <span className="text-sm text-muted-foreground">{files.length}</span>
        </div>
      </CardContent>
    </Card>
  );
});

export { ServerActivity };
