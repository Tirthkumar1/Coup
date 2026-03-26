/**
 * characters/index.ts
 *
 * Single entry point for all character definitions.
 * gameLogic.ts imports ACTION_CHARACTERS and BLOCK_CHARACTERS from here
 * so that adding or modifying a character only requires touching that
 * character's own file (and re-exporting it here if it's new).
 */

import Duke from './Duke'
import Assassin from './Assassin'
import Captain from './Captain'
import Ambassador from './Ambassador'
import Contessa from './Contessa'
import type { CharacterDefinition } from './types'
import type { ActionType, Character } from '../gameLogic'

export { Duke, Assassin, Captain, Ambassador, Contessa }
export type { CharacterDefinition }

/** Every character in play order. */
export const ALL_CHARACTERS: CharacterDefinition[] = [
  Duke, Assassin, Captain, Ambassador, Contessa,
]

/**
 * Maps a role-based ActionType to the Character that enables it.
 * e.g. 'tax' → 'Duke'
 */
export const ACTION_CHARACTERS: Partial<Record<ActionType, Character>> =
  Object.fromEntries(
    ALL_CHARACTERS
      .filter(c => c.action)
      .map(c => [c.action!.type, c.name]),
  )

/**
 * Maps an ActionType to the list of Characters that can block it.
 * e.g. 'steal' → ['Captain', 'Ambassador']
 */
export const BLOCK_CHARACTERS: Partial<Record<ActionType, Character[]>> =
  ALL_CHARACTERS.reduce<Partial<Record<ActionType, Character[]>>>((acc, c) => {
    for (const blocked of c.blocks) {
      acc[blocked] = [...(acc[blocked] ?? []), c.name]
    }
    return acc
  }, {})
