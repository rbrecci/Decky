import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { signUp } from '../../src/auth/AuthProvider';
import { AuthForm, AuthSubmit } from '../../src/auth/AuthForm';
import { ConfirmationResend } from '../../src/auth/ConfirmationResend';
import { authErrorMessage } from '../../src/auth/flows';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '../../src/auth/validators';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';

type Field = 'name' | 'email' | 'password' | 'confirmation';

export default function Register() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', password: '', confirmation: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const set = (field: Field) => (text: string) => setValues((v) => ({ ...v, [field]: text }));

  async function submit() {
    if (busy.current) return;
    const next = {
      name: validateDisplayName(values.name),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirmation: validatePasswordConfirmation(values.password, values.confirmation),
    };
    setErrors(next);
    setServerError(null);
    if (Object.values(next).some(Boolean)) return;

    busy.current = true;
    setLoading(true);
    try {
      const result = await signUp(values.email, values.password, values.name);
      if (result === 'confirm_email') setConfirmSent(true);
      else router.replace(code ? { pathname: '/invite', params: { code } } : '/');
    } catch (error) {
      setServerError(authErrorMessage(error));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (confirmSent) {
    return (
      <Screen title="Quase lá" onBack={() => router.replace(code ? { pathname: '/login', params: { code } } : '/login')}>
        <Notice kind="success" message={`Enviamos um link de confirmação para ${values.email.trim()}. Abra o e-mail e depois entre.`} />
        <ConfirmationResend email={values.email} initiallySent />
        <Button label="Ir para o login" onPress={() => router.replace(code ? { pathname: '/login', params: { code } } : '/login')} />
      </Screen>
    );
  }

  return (
    <Screen title="Criar conta" subtitle="Seu nome aparece na mesa para os outros jogadores." onBack={() => router.replace(code ? { pathname: '/login', params: { code } } : '/login')}>
      <AuthForm onSubmit={submit}>
      <TextField required nativeID="display-name" autoComplete="nickname" label="Seu nome na mesa" value={values.name} onChangeText={set('name')} error={errors.name} placeholder="Ex.: Caio" maxLength={20} />
      <TextField
        required
        nativeID="email"
        label="E-mail"
        value={values.email}
        onChangeText={set('email')}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        inputMode="email"
        placeholder="nome@email.com"
      />
      <TextField
        required
        nativeID="new-password"
        label="Senha (6+ caracteres, letras e números)"
        value={values.password}
        onChangeText={set('password')}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Crie uma senha"
      />
      <TextField
        required
        nativeID="password-confirmation"
        label="Repita a senha"
        value={values.confirmation}
        onChangeText={set('confirmation')}
        error={errors.confirmation}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Digite a senha de novo"
        returnKeyType="done"
        onSubmitEditing={Platform.OS === 'web' ? undefined : submit}
      />
      <Notice kind="error" message={serverError} />
      <AuthSubmit label="Cadastrar" onPress={submit} loading={loading} />
      </AuthForm>
    </Screen>
  );
}
