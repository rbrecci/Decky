import { useRef, useState } from 'react';
import { useRerenderAt } from '../lib/useRerenderAt';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';
import { authErrorMessage, mailCooldownSeconds, resendConfirmation } from './flows';

export function ConfirmationResend({ email, initiallySent = false }: { email: string; initiallySent?: boolean }) {
  const [availableAt, setAvailableAt] = useState(initiallySent ? Date.now() + 60_000 : 0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  useRerenderAt([availableAt]);
  const cooling = availableAt > Date.now() || mailCooldownSeconds('signup', email) > 0;

  async function resend() {
    if (busy.current || cooling) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await resendConfirmation(email);
      setMessage('Se a confirmação estiver pendente, você receberá um novo e-mail.');
    } catch (next) {
      setError(authErrorMessage(next));
    } finally {
      setAvailableAt(Date.now() + mailCooldownSeconds('signup', email) * 1000);
      busy.current = false;
      setLoading(false);
    }
  }

  return <>
    <Notice kind="error" message={error} />
    <Notice kind="success" message={message} />
    <Button label={cooling ? 'Aguarde um minuto para reenviar' : 'Reenviar confirmação'} variant="secondary" onPress={resend} loading={loading} disabled={cooling} />
  </>;
}
