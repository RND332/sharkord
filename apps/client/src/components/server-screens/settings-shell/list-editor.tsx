import { Card, type TIconComponent } from '@sharkord/ui';
import { memo, type ReactNode } from 'react';
import { StatePanel } from './state-panel';

type TSettingsListEditorProps = {
  list: ReactNode;
  editor: ReactNode;
  emptyIcon: TIconComponent;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
};

const SettingsListEditor = memo(
  ({
    list,
    editor,
    emptyIcon,
    emptyTitle,
    emptyDescription,
    emptyAction
  }: TSettingsListEditorProps) => {
    return (
      <div className="flex flex-col gap-6 md:flex-row md:gap-[30px]">
        <div className="w-full shrink-0 md:w-[238px]">{list}</div>

        {editor || (
          <Card className="flex flex-1 items-center justify-center">
            <StatePanel
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          </Card>
        )}
      </div>
    );
  }
);

export { SettingsListEditor };
