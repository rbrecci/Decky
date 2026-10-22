// Quais botões de truco aparecem para quem está jogando. Só espelha getLegalActions do motor:
// o servidor valida de novo cada ação, então esconder botão aqui é conforto, não segurança.
import { teamDecisionFor, type LegalActions } from '../../supabase/functions/_shared/engine/game.ts';
import type { GameAction, PublicGameState, Seat } from '../contracts/types';
import { nextTrucoValue, proposalStake, proposalVerb, trucoName } from './describe';

export type ControlId = 'request' | 'accept' | 'refuse' | 'raise' | 'fold' | 'confirm' | 'reject' | 'cancel';

export interface Control {
  id: ControlId;
  label: string;
  hint: string;
  variant: 'primary' | 'secondary' | 'dark' | 'gold';
  /** Ação enviada ao servidor. */
  action: GameAction;
  /** A ação só vale com o parceiro: o botão abre um pedido de confirmação da dupla. */
  needsPartner: boolean;
}

export type ControlsMode =
  /** Há pedido de truco e esta dupla responde. */
  | 'respond'
  /** Há pedido de truco feito pela própria dupla: só aguardar. */
  | 'waiting_answer'
  /** Jogo normal: jogar carta, pedir truco, correr. */
  | 'play'
  /** O parceiro pediu uma decisão da dupla: confirmar ou recusar. */
  | 'proposal_confirm'
  /** Este jogador pediu uma decisão da dupla: aguardar o parceiro (ou desistir). */
  | 'proposal_sent'
  /** A outra dupla está decidindo: só aguardar. */
  | 'proposal_other'
  | 'none';

const PARTNER_HINT = ' Seu parceiro precisa confirmar.';

export function trucoControls(
  state: PublicGameState,
  legal: LegalActions,
  seat: Seat,
): { mode: ControlsMode; controls: Control[] } {
  if (state.status !== 'playing') return { mode: 'none', controls: [] };

  // Botão de uma ação comum, já dizendo se ela vai precisar do parceiro.
  const control = (id: ControlId, label: string, hint: string, variant: Control['variant'], action: GameAction): Control => {
    const needsPartner = state.gameMode !== '1v1' && teamDecisionFor(state, seat, action) !== null;
    return { id, label, hint: needsPartner ? hint + PARTNER_HINT : hint, variant, action, needsPartner };
  };

  const proposal = state.proposal ?? null;
  if (proposal) {
    if (legal.confirmProposal) {
      const verb = proposalVerb(proposal, state.truco);
      return {
        mode: 'proposal_confirm',
        controls: [
          {
            id: 'reject',
            label: 'Não',
            hint: `Recusa ${verb}; a mão continua`,
            variant: 'secondary',
            action: { type: 'reject_proposal', proposalId: proposal.id },
            needsPartner: false,
          },
          {
            id: 'confirm',
            label: `Confirmar`,
            hint: `Confirma ${verb}: ${proposalStake(proposal)}`,
            variant: proposal.decision === 'fold' || proposal.decision === 'refuse' ? 'primary' : 'gold',
            action: { type: 'confirm_proposal', proposalId: proposal.id },
            needsPartner: false,
          },
        ],
      };
    }
    if (legal.rejectProposal) {
      return {
        mode: 'proposal_sent',
        controls: [
          {
            id: 'cancel',
            label: 'Desistir do pedido',
            hint: 'Cancela o pedido antes de o parceiro responder',
            variant: 'secondary',
            action: { type: 'reject_proposal', proposalId: proposal.id },
            needsPartner: false,
          },
        ],
      };
    }
    return { mode: 'proposal_other', controls: [] };
  }

  if (state.truco) {
    if (!legal.respondTruco) return { mode: 'waiting_answer', controls: [] };
    const value = state.truco.value;
    const controls: Control[] = [
      control('accept', 'Aceitar', `A mão passa a valer ${value}.`, 'dark', { type: 'respond_truco', response: 'accept' }),
      control(
        'refuse',
        'Correr',
        `${state.gameMode === '1v1' ? 'O adversário' : 'A outra dupla'} ganha ${state.handValue} ${state.handValue === 1 ? 'ponto' : 'pontos'}.`,
        'secondary',
        { type: 'respond_truco', response: 'refuse' },
      ),
    ];
    if (legal.raiseTruco) {
      const raised = nextTrucoValue(value);
      controls.push(
        control(
          'raise',
          `Pedir ${trucoName(raised)}`,
          `Aceita o ${trucoName(value).toLowerCase()} e pede para a mão valer ${raised}.`,
          'gold',
          { type: 'respond_truco', response: 'raise' },
        ),
      );
    }
    return { mode: 'respond', controls };
  }

  const controls: Control[] = [];
  if (legal.requestTruco && legal.nextTrucoValue) {
    controls.push(
      control('request', `Pedir ${trucoName(legal.nextTrucoValue)}`, `Pede para a mão valer ${legal.nextTrucoValue}.`, 'gold', {
        type: 'request_truco',
      }),
    );
  }
  if (legal.fold) {
    controls.push(control('fold', 'Correr', state.gameMode === '1v1' ? 'Desiste da mão; o adversário ganha os pontos.' : 'Desiste da mão; a outra dupla ganha os pontos.', 'secondary', { type: 'fold' }));
  }
  return { mode: 'play', controls };
}
