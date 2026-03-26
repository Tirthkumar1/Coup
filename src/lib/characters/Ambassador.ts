import type { CharacterDefinition } from './types'

/**
 * Ambassador
 * ─────────────────────────────────────────────────────────────────
 * Action  : Exchange — draw 2 cards from the deck, keep the same
 *           number you currently hold unrevealed, return the rest
 *           (challengeable, not blockable).
 * Block   : Steal — diplomatic immunity prevents a Captain stealing.
 */
const Ambassador: CharacterDefinition = {
  name: 'Ambassador',

  action: {
    type: 'exchange',
    challengeable: true,
    actorEffect: 'exchange_cards',
  },

  blocks: ['steal'],
}

export default Ambassador
