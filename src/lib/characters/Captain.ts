import type { CharacterDefinition } from './types'

/**
 * Captain
 * ─────────────────────────────────────────────────────────────────
 * Action  : Steal — take up to 2 coins from a target player
 *           (challengeable, blockable by Captain or Ambassador).
 * Block   : Steal — prevents another Captain from stealing from you.
 */
const Captain: CharacterDefinition = {
  name: 'Captain',

  action: {
    type: 'steal',
    challengeable: true,
    targetRequired: true,
    stealAmount: 2,
  },

  blocks: ['steal'],
}

export default Captain
