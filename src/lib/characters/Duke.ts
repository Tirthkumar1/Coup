import type { CharacterDefinition } from './types'

/**
 * Duke
 * ─────────────────────────────────────────────────────────────────
 * Action  : Tax — take 3 coins from the treasury (challengeable).
 * Block   : Foreign Aid — prevents another player taking 2 free coins.
 */
const Duke: CharacterDefinition = {
  name: 'Duke',

  action: {
    type: 'tax',
    challengeable: true,
    coins: 3,
  },

  blocks: ['foreign_aid'],
}

export default Duke
