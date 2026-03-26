import type { ActionType, Character } from '../gameLogic'

/**
 * Describes everything a single character can do.
 * gameLogic.ts reads these definitions to build its lookup tables
 * and drive resolution — no character logic lives in gameLogic itself.
 */
export interface CharacterDefinition {
  name: Character

  /** Primary action this character enables on the owner's turn, if any. */
  action?: {
    type: ActionType
    challengeable: boolean
    /** Coins transferred from treasury to actor (positive) or actor to treasury (negative). */
    coins?: number
    /** Whether the action requires a target player. */
    targetRequired?: boolean
    /** Coins drained from the target (steal). */
    stealAmount?: number
    /** Actor pays this cost up front (non-refundable). */
    cost?: number
    /** Effect applied to the target when the action resolves. */
    targetEffect?: 'lose_influence'
    /** Effect applied to the actor when the action resolves. */
    actorEffect?: 'exchange_cards'
  }

  /** Actions that this character can block. */
  blocks: ActionType[]
}
