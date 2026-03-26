import type { CharacterDefinition } from './types'

/**
 * Contessa
 * ─────────────────────────────────────────────────────────────────
 * Action  : None — the Contessa has no active turn action.
 * Block   : Assassinate — protects the holder from assassination.
 */
const Contessa: CharacterDefinition = {
  name: 'Contessa',
  blocks: ['assassinate'],
}

export default Contessa
