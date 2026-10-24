import { expect, it } from 'vitest';
import { errorMessage } from '../../src/lib/errors';
it('não descreve capacidade fixa de duplas para erros também usados no duelo',()=>{
  expect(errorMessage('room_full')).toBe('Esta sala está cheia.');
  expect(errorMessage('not_enough_players')).toBe('Ainda faltam jogadores nesta sala.');
  expect(errorMessage('not_member')).toBe('Só os jogadores desta partida podem jogar. A mesa apenas exibe a partida.');
});
it('identifica manutenção sem apresentá-la como erro inesperado',()=>{
  expect(errorMessage({message:'maintenance'})).toBe('O Decky está em manutenção. Tente novamente mais tarde.');
});
