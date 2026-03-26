import type { CharacterDefinition } from './types'

/**
 * Assassin
 * ─────────────────────────────────────────────────────────────────
 * Action  : Assassinate — pay 3 coins, force a target to lose one
 *           influence (challengeable, blockable by Contessa).
 * Block   : None.
 */
const Assassin: CharacterDefinition = {
  name: 'Assassin',

  action: {
    type: 'assassinate',
    challengeable: true,
    cost: 3,
    targetRequired: true,
    targetEffect: 'lose_influence',
  },

  blocks: [],
}

export default Assassin
