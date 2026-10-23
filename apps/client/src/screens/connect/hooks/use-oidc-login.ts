import { getUrlFromServer } from '@/helpers/get-file-url';
import { getOidcHandoffCode, startOidcLogin } from '@/helpers/oidc';
import { useStrictEffect } from '@/hooks/use-strict-effect';
import { OidcError, type TServerInfo } from '@dodecagon/shared';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TUseOidcLoginOptions = {
  onToken: (token: string) => Promise<void>;
  info?: TServerInfo;
  error?: string | null;
};

const useOidcLogin = ({ onToken, info, error }: TUseOidcLoginOptions) => {
  const { t } = useTranslation('connect');

  // the fragment of the url never reaches the server, so the code of the
  // handoff can only be read in the browser. the first render of the server
  // and of the browser have to look the same, so the work starts after it
  const [isCompleting, setIsCompleting] = useState(false);

  const exchangeCode = useCallback(
    async (code: string) => {
      try {
        const response = await fetch(`${getUrlFromServer()}/oidc/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        if (!response.ok) throw new Error(t('oidcError.expired'));

        const data = (await response.json()) as { token: string };

        await onToken(data.token);
      } catch (exchangeError) {
        const message =
          exchangeError instanceof Error
            ? exchangeError.message
            : String(exchangeError);

        toast.error(t('connectError', { message }));
      } finally {
        setIsCompleting(false);
      }
    },
    [onToken, t]
  );

  useStrictEffect(() => {
    const code = getOidcHandoffCode();

    if (!code && !error) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    if (error) {
      const isKnown = Object.values(OidcError).includes(error as OidcError);

      toast.error(t(isKnown ? `oidcError.${error}` : 'oidcError.server_error'));
      setIsCompleting(false);

      return;
    }

    setIsCompleting(true);
    exchangeCode(code!);
  }, [error, exchangeCode, t]);

  return {
    isCompleting,
    isEnabled: !!info?.oidcEnabled,
    isLocalLoginAllowed: !info?.oidcDisableLocalLogin,
    startLogin: startOidcLogin
  };
};

export { useOidcLogin };
