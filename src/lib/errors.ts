// Traduz os códigos de erro do servidor para mensagens curtas em português.
const MESSAGES: Record<string, string> = {
  // Autenticação
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'Senha fraca. Use pelo menos 6 caracteres.',
  over_email_send_rate_limit: 'Muitas tentativas. Espere um pouco e tente de novo.',
  not_authenticated: 'Sua sessão expirou. Entre de novo.',
  maintenance: 'O Decky está em manutenção. Tente novamente mais tarde.',
  // Salas
  room_not_found: 'Sala não encontrada. Confira o código.',
  room_full: 'Esta sala está cheia.',
  room_started: 'Esta partida já começou.',
  already_in_room: 'Você já está nesta sala.',
  seat_taken: 'Este lugar já está ocupado.',
  invalid_seat: 'Lugar inválido.',
  invalid_mode: 'Modo de sala inválido.',
  room_create_timeout: 'A criação demorou demais. Feche e abra o app para tentar novamente.',
  not_host: 'Só quem criou a sala pode iniciar.',
  not_enough_players: 'Ainda faltam jogadores nesta sala.',
  players_not_ready: 'Todos precisam marcar "Pronto".',
  // Partida
  not_your_turn: 'Não é a sua vez.',
  invalid_card: 'Esta carta não está na sua mão.',
  illegal_action: 'Esta jogada não é permitida agora.',
  match_over: 'A partida já terminou.',
  too_early: 'Ainda há tempo para esta jogada.',
  conflict: 'A mesa mudou. Atualizamos para você, tente de novo.',
  not_member: 'Só os jogadores desta partida podem jogar. A mesa apenas exibe a partida.',
  match_not_found: 'Partida não encontrada.',
  // Genéricos
  bad_request: 'Pedido inválido.',
  server_error: 'Erro no servidor. Tente de novo.',
  network_error: 'Sem conexão. Verifique a internet.',
};

/** Extrai um código conhecido de um erro qualquer (PostgREST, Auth, Edge Function ou string). */
export function errorCode(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as { code?: string; message?: string; name?: string };
    if (e.code && MESSAGES[e.code]) return e.code;
    if (e.message) {
      const known = Object.keys(MESSAGES).find((code) => e.message!.includes(code));
      if (known) return known;
      if (/network|fetch/i.test(e.message)) return 'network_error';
    }
  }
  return 'server_error';
}

export function errorMessage(error: unknown): string {
  return MESSAGES[errorCode(error)] ?? MESSAGES.server_error;
}
