import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { signUp } from '../../src/auth/AuthProvider';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '../../src/auth/validators';
import { errorMessage } from '../../src/lib/errors';
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

  const set = (field: Field) => (text: string) => setValues((v) => ({ ...v, [field]: text }));

  async function submit() {
    const next = {
      name: validateDisplayName(values.name),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirmation: validatePasswordConfirmation(values.password, values.confirmation),
    };
    setErrors(next);
    setServerError(null);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      const result = await signUp(values.email, values.password, values.name);
      if (result === 'confirm_email') setConfirmSent(true);
      else router.replace(code ? { pathname: '/invite', params: { code } } : '/');
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (confirmSent) {
    return (
      <Screen title="Quase lá">
        <Notice kind="success" message={`Enviamos um link de confirmação para ${values.email.trim()}. Abra o e-mail e depois entre.`} />
        <Button label="Ir para o login" onPress={() => router.replace(code ? { pathname: '/login', params: { code } } : '/login')} />
      </Screen>
    );
  }

  return (
    <Screen title="Criar conta" subtitle="Seu nome aparece na mesa para os outros jogadores.">
      <TextField label="Seu nome na mesa" value={values.name} onChangeText={set('name')} error={errors.name} placeholder="Ex.: Caio" maxLength={20} />
      <TextField
        label="E-mail"
        value={values.email}
        onChangeText={set('email')}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="nome@email.com"
      />
      <TextField
        label="Senha (6+ caracteres, letras e números)"
        value={values.password}
        onChangeText={set('password')}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Crie uma senha"
      />
      <TextField
        label="Repita a senha"
        value={values.confirmation}
        onChangeText={set('confirmation')}
        error={errors.confirmation}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Digite a senha de novo"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Notice kind="error" message={serverError} />
      <Button label="Cadastrar" onPress={submit} loading={loading} />
      <Button label="Já tenho conta" variant="secondary" onPress={() => router.replace(code ? { pathname: '/login', params: { code } } : '/login')} />
    </Screen>
  );
}
