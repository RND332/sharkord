import { LanguageSwitcher } from '@/components/language-switcher';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { connect } from '@/features/server/actions';
import { useInfo } from '@/features/server/hooks';
import { getFileUrl, getUrlFromServer } from '@/helpers/get-file-url';
import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  LocalStorageKey,
  removeLocalStorageItem,
  SessionStorageKey,
  setLocalStorageItem,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { useForm } from '@/hooks/use-form';
import { PluginSlot, TestId } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Group,
  Input,
  Label,
  Spinner,
  Switch
} from '@sharkord/ui';
import { memo, useCallback, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useOidcLogin } from './hooks/use-oidc-login';

const Connect = memo(() => {
  const { t } = useTranslation('connect');
  const { values, r, setErrors, onChange } = useForm<{
    identity: string;
    password: string;
    autoLogin: boolean;
  }>({
    identity: getLocalStorageItem(LocalStorageKey.IDENTITY) || '',
    password: '',
    autoLogin: getLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN)
  });

  const [loading, setLoading] = useState(false);
  const info = useInfo();

  const inviteCode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    return invite || undefined;
  }, []);

  const startSession = useCallback(
    async (token: string) => {
      setSessionStorageItem(SessionStorageKey.TOKEN, token);
      setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, values.autoLogin);

      if (values.autoLogin) {
        setLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN, token);
      } else {
        removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
      }

      await connect();
    },
    [values.autoLogin]
  );

  const oidc = useOidcLogin({ onToken: startSession });

  const onConnectClick = useCallback(async () => {
    setLoading(true);

    try {
      const url = getUrlFromServer();
      const response = await fetch(`${url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: values.identity,
          password: values.password,
          invite: inviteCode
        })
      });

      if (!response.ok) {
        const data = await response.json();

        setErrors(data.errors || {});
        return;
      }

      const data = (await response.json()) as { token: string };

      setLocalStorageItem(LocalStorageKey.IDENTITY, values.identity);

      await startSession(data.token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      toast.error(t('connectError', { message: errorMessage }));
    } finally {
      setLoading(false);
    }
  }, [
    values.identity,
    values.password,
    setErrors,
    inviteCode,
    startSession,
    t
  ]);

  const onFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onConnectClick();
    },
    [onConnectClick]
  );

  const onAutoLoginToggle = useCallback(() => {
    const nextAutoLogin = !values.autoLogin;

    onChange('autoLogin', nextAutoLogin);
    setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, nextAutoLogin);

    if (!nextAutoLogin) {
      removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
    }
  }, [onChange, values.autoLogin]);

  const logoSrc = useMemo(() => {
    if (info?.logo) {
      return getFileUrl(info.logo);
    }

    return '/logo.webp';
  }, [info]);

  if (oidc.isCompleting) {
    return (
      <div className="flex flex-col justify-center items-center h-full gap-2">
        <Spinner size="lg" />
        <span className="text-xl">{t('oidcCompleting')}</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-canvas px-6 py-12 dark">
      <header className="absolute inset-x-0 top-0 flex h-16 items-center justify-between border-b border-line bg-rail px-7">
        <span className="text-[17px] font-bold tracking-tight">sharkord</span>
        <LanguageSwitcher
          variant="full"
          className="h-8 w-auto border-0 bg-transparent text-muted-foreground"
        />
      </header>
      <Card className="w-full max-w-[430px] gap-0 bg-nav py-8">
        <CardHeader className="pb-5">
          <CardTitle className="flex flex-row items-center gap-3.5 text-left">
            <img
              src={logoSrc}
              alt=""
              className="size-12 shrink-0 rounded-md object-contain"
            />
            <div className="min-w-0">
              {info?.name && (
                <div className="truncate text-xl font-bold leading-7">
                  {info.name}
                </div>
              )}
              <div className="text-[13px] font-normal leading-[18px] text-muted-foreground">
                Connect to this Sharkord server
              </div>
            </div>
          </CardTitle>
          <PluginSlotRenderer slotId={PluginSlot.CONNECT_SCREEN} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {info?.description && (
            <span className="text-sm text-muted-foreground">
              {info?.description}
            </span>
          )}

          {oidc.isLocalLoginAllowed && (
            <form
              className="flex flex-col gap-4"
              onSubmit={onFormSubmit}
              data-testid={TestId.CONNECT_FORM}
            >
              <Group label={t('identityLabel')} help={t('identityHelp')}>
                <Input
                  {...r('identity')}
                  autoComplete="username"
                  aria-label={t('identityLabel')}
                  data-testid={TestId.CONNECT_IDENTITY_INPUT}
                />
              </Group>
              <Group label={t('passwordLabel')}>
                <Input
                  {...r('password')}
                  type="password"
                  autoComplete="current-password"
                  aria-label={t('passwordLabel')}
                  onEnter={onConnectClick}
                  data-testid={TestId.CONNECT_PASSWORD_INPUT}
                />
              </Group>
            </form>
          )}

          <div
            className="flex items-center gap-2 w-fit cursor-pointer"
            data-testid={TestId.CONNECT_AUTO_LOGIN_SWITCH}
            onClick={onAutoLoginToggle}
          >
            <Switch
              checked={values.autoLogin}
              aria-label={t('autoLoginLabel')}
            />
            <Label className="text-sm cursor-pointer">
              {t('autoLoginLabel')}
            </Label>
          </div>

          <div className="flex flex-col gap-2">
            {!window.isSecureContext && (
              <Alert variant="destructive">
                <AlertTitle>{t('insecureTitle')}</AlertTitle>
                <AlertDescription>{t('insecureDesc')}</AlertDescription>
              </Alert>
            )}

            {oidc.isLocalLoginAllowed && (
              <Button
                className="h-11 w-full"
                onClick={onConnectClick}
                disabled={loading || !values.identity || !values.password}
                data-testid={TestId.CONNECT_BUTTON}
              >
                {t('connectBtn')}
              </Button>
            )}

            {oidc.isEnabled && (
              <Button
                className="h-10 w-full"
                variant="outline"
                onClick={oidc.startLogin}
                disabled={loading}
                data-testid={TestId.CONNECT_OIDC_BUTTON}
              >
                {t('oidcBtn')}
              </Button>
            )}

            {oidc.isLocalLoginAllowed &&
              !info?.allowNewUsers &&
              !inviteCode && (
                <span className="text-xs text-muted-foreground text-center">
                  {t('registrationDisabled')}
                </span>
              )}

            {inviteCode && (
              <Alert variant="info">
                <AlertTitle>{t('invitedTitle')}</AlertTitle>
                <AlertDescription>
                  <span className="font-mono text-xs">
                    {t('inviteCode', { code: inviteCode })}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="absolute bottom-5 flex items-center justify-center gap-2 text-xs text-subtle-foreground select-none">
        <span>v{VITE_APP_VERSION}</span>
        <a
          href="https://github.com/sharkord/sharkord"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>

        <a
          className="text-xs"
          href="https://sharkord.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sharkord
        </a>
      </div>
    </div>
  );
});

export { Connect };
