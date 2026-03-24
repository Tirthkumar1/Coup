/**
 * gameLogic.ts
 * Pure TypeScript state machine for the card game Coup.
 * No side effects, no I/O – every function takes a state and returns a new state.
 *
 * Tables of truth
 * ───────────────
 * Characters  : Duke | Assassin | Captain | Ambassador | Contessa
 * Deck        : 3 copies of each character (15 cards total)
 * Starting    : 2 coins per player, 2 cards per player
 * Treasury    : 30 − (players × 2) coins at game start
 * Challenge window : 7 seconds (encoded as a timestamp in state)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Character =
  | 'Duke'
  | 'Assassin'
  | 'Captain'
  | 'Ambassador'
  | 'Contessa'

export type ActionType =
  | 'income'
  | 'foreign_aid'
  | 'coup'
  | 'tax'
  | 'assassinate'
  | 'steal'
  | 'exchange'
  | 'block'
  | 'challenge'
  | 'pass'
  | 'lose_influence'

export type GamePhase =
  | 'waiting'
  | 'player_turn'
  | 'action_declared'
  | 'challenge_window'
  | 'block_window'
  | 'block_challenge_window'
  | 'resolve'
  | 'lose_influence'
  | 'game_over'

export interface Card {
  character: Character
  revealed: boolean
}

export interface Player {
  userId: string
  displayName: string
  coins: number
  cards: Card[]
  isEliminated: boolean
}

/** A pending action waiting for challenges or blocks. */
export interface PendingAction {
  actorId: string
  action: ActionType
  targetId?: string
  /** Character claimed by a blocker (set during block_window resolution). */
  blockerCharacter?: Character
  blockerId?: string
  /** True once the block itself is being challenged. */
  blockBeingChallenged?: boolean
}

export interface GameState {
  players: Player[]
  deck: Card[]
  phase: GamePhase
  currentTurnUserId: string
  pendingAction: PendingAction | null
  /** ISO timestamp after which the challenge/block window closes. */
  challengeDeadline: string | null
  treasuryCoins: number
  /** userId of the winner, set when phase === 'game_over'. */
  winnerId: string | null
  /** userId currently required to reveal (lose) a card. */
  losingInfluenceUserId: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CHARACTERS: Character[] = [
  'Duke',
  'Assassin',
  'Captain',
  'Ambassador',
  'Contessa',
]

const CHALLENGE_WINDOW_MS = 7_000

/** Characters that can perform each primary action. */
const ACTION_CHARACTERS: Partial<Record<ActionType, Character>> = {
  tax: 'Duke',
  assassinate: 'Assassin',
  steal: 'Captain',
  exchange: 'Ambassador',
}

/** Characters that can block each action (multiple options for some). */
const BLOCK_CHARACTERS: Partial<Record<ActionType, Character[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle – returns a new array. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildFullDeck(): Card[] {
  return CHARACTERS.flatMap((character) =>
    Array.from({ length: 3 }, () => ({ character, revealed: false })),
  )
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function getPlayer(state: GameState, userId: string): Player {
  const p = state.players.find((p) => p.userId === userId)
  if (!p) throw new Error(`Player ${userId} not found`)
  return p
}

function mutPlayer(
  state: GameState,
  userId: string,
  fn: (p: Player) => void,
): GameState {
  const s = deepClone(state)
  fn(getPlayer(s, userId))
  return s
}

function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.isEliminated)
}

function nextTurnUserId(state: GameState, afterUserId: string): string {
  const active = activePlayers(state)
  const idx = active.findIndex((p) => p.userId === afterUserId)
  return active[(idx + 1) % active.length].userId
}

function challengeDeadlineNow(): string {
  return new Date(Date.now() + CHALLENGE_WINDOW_MS).toISOString()
}

/**
 * Reveal one unrevealed card from a player; mark player eliminated if they
 * have no more hidden cards.
 */
function revealCard(state: GameState, userId: string, cardIndex: number): GameState {
  let s = deepClone(state)
  const player = getPlayer(s, userId)
  if (cardIndex < 0 || cardIndex >= player.cards.length)
    throw new Error('Invalid card index')
  if (player.cards[cardIndex].revealed)
    throw new Error('Card already revealed')
  player.cards[cardIndex].revealed = true
  if (player.cards.every((c) => c.revealed)) {
    player.isEliminated = true
  }
  return s
}

/**
 * Return the player whose turn comes after the current one.
 * Advances currentTurnUserId and resets pending state.
 */
function advanceTurn(state: GameState): GameState {
  const s = deepClone(state)
  s.currentTurnUserId = nextTurnUserId(s, s.currentTurnUserId)
  s.pendingAction = null
  s.challengeDeadline = null
  s.phase = 'player_turn'
  s.losingInfluenceUserId = null
  return s
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create the initial GameState for a new game.
 *
 * @param playerInfos - Array of { userId, displayName } for each participant.
 * @returns A fully initialised GameState ready for the first turn.
 */
export function initGame(
  playerInfos: { userId: string; displayName: string }[],
): GameState {
  if (playerInfos.length < 2 || playerInfos.length > 6)
    throw new Error('Coup requires 2–6 players')

  let deck = shuffle(buildFullDeck())
  const players: Player[] = playerInfos.map(({ userId, displayName }) => {
    const cards = deck.splice(0, 2)
    return { userId, displayName, coins: 2, cards, isEliminated: false }
  })

  return {
    players,
    deck,
    phase: 'player_turn',
    currentTurnUserId: playerInfos[0].userId,
    pendingAction: null,
    challengeDeadline: null,
    treasuryCoins: 30 - playerInfos.length * 2,
    winnerId: null,
    losingInfluenceUserId: null,
  }
}

/**
 * Return every ActionType the given player may legally declare on their turn.
 * Does not include reactive actions (block / challenge / pass / lose_influence).
 *
 * @param state  - Current game state.
 * @param userId - The player asking for valid actions.
 */
export function getValidActions(
  state: GameState,
  userId: string,
): ActionType[] {
  if (state.phase !== 'player_turn') return []
  if (state.currentTurnUserId !== userId) return []

  const player = getPlayer(state, userId)
  if (player.isEliminated) return []

  // With 10+ coins the player MUST coup.
  if (player.coins >= 10) return ['coup']

  const actions: ActionType[] = ['income', 'foreign_aid', 'tax', 'exchange']

  // Coup requires 7 coins.
  if (player.coins >= 7) actions.push('coup')

  // Assassinate requires 3 coins and a living target.
  if (player.coins >= 3 && activePlayers(state).length > 1)
    actions.push('assassinate')

  // Steal requires a target with coins.
  const stealTargets = activePlayers(state).filter(
    (p) => p.userId !== userId && p.coins > 0,
  )
  if (stealTargets.length > 0) actions.push('steal')

  return actions
}

/**
 * Advance the game state by applying an action from a player.
 *
 * Handles both primary turn actions and reactive ones
 * (block, challenge, pass, lose_influence).
 *
 * @param state    - Current game state.
 * @param userId   - Player performing the action.
 * @param action   - The action type.
 * @param targetId - Required for coup, assassinate, steal, block (when blocking steal).
 * @param character - Character claimed when blocking (required for 'block').
 */
export function applyAction(
  state: GameState,
  userId: string,
  action: ActionType,
  targetId?: string,
  character?: Character,
): GameState {
  let s = deepClone(state)

  switch (action) {
    // ── INCOME ──────────────────────────────────────────────────────────────
    case 'income': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      s = mutPlayer(s, userId, (p) => { p.coins += 1 })
      s.treasuryCoins -= 1
      return advanceTurn(s)
    }

    // ── FOREIGN AID ─────────────────────────────────────────────────────────
    case 'foreign_aid': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      s.pendingAction = { actorId: userId, action }
      s.phase = 'block_window'
      s.challengeDeadline = challengeDeadlineNow()
      return s
    }

    // ── COUP ─────────────────────────────────────────────────────────────────
    case 'coup': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      if (!targetId) throw new Error('coup requires targetId')
      const actor = getPlayer(s, userId)
      if (actor.coins < 7) throw new Error('Need 7 coins to coup')
      s = mutPlayer(s, userId, (p) => { p.coins -= 7 })
      s.treasuryCoins += 7
      s.pendingAction = { actorId: userId, action: 'coup', targetId }
      s.phase = 'lose_influence'
      s.losingInfluenceUserId = targetId
      return s
    }

    // ── TAX (Duke) ───────────────────────────────────────────────────────────
    case 'tax': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      s.pendingAction = { actorId: userId, action: 'tax' }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      return s
    }

    // ── ASSASSINATE (Assassin) ───────────────────────────────────────────────
    case 'assassinate': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      if (!targetId) throw new Error('assassinate requires targetId')
      const assassin = getPlayer(s, userId)
      if (assassin.coins < 3) throw new Error('Need 3 coins to assassinate')
      s = mutPlayer(s, userId, (p) => { p.coins -= 3 })
      s.treasuryCoins += 3
      s.pendingAction = { actorId: userId, action: 'assassinate', targetId }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      return s
    }

    // ── STEAL (Captain) ──────────────────────────────────────────────────────
    case 'steal': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      if (!targetId) throw new Error('steal requires targetId')
      s.pendingAction = { actorId: userId, action: 'steal', targetId }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      return s
    }

    // ── EXCHANGE (Ambassador) ────────────────────────────────────────────────
    case 'exchange': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      s.pendingAction = { actorId: userId, action: 'exchange' }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      return s
    }

    // ── CHALLENGE ────────────────────────────────────────────────────────────
    case 'challenge': {
      if (!canChallenge(s, userId)) throw new Error('Cannot challenge now')
      return resolveChallenge(s, userId)
    }

    // ── BLOCK ────────────────────────────────────────────────────────────────
    case 'block': {
      if (!canBlock(s, userId)) throw new Error('Cannot block now')
      if (!character) throw new Error('block requires character')
      const pending = s.pendingAction!
      const allowed = BLOCK_CHARACTERS[pending.action] ?? []
      if (!allowed.includes(character))
        throw new Error(`${character} cannot block ${pending.action}`)
      s.pendingAction = {
        ...pending,
        blockerId: userId,
        blockerCharacter: character,
      }
      s.phase = 'block_challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      return s
    }

    // ── PASS ─────────────────────────────────────────────────────────────────
    case 'pass': {
      // Passing in block_window or block_challenge_window means no response.
      // When all other players pass, resolve the original action.
      if (
        s.phase !== 'challenge_window' &&
        s.phase !== 'block_window' &&
        s.phase !== 'block_challenge_window'
      )
        throw new Error('Cannot pass in this phase')

      if (s.phase === 'block_challenge_window') {
        // Nobody challenges the block → original action is cancelled.
        return advanceTurn(s)
      }

      if (s.phase === 'block_window') {
        // Nobody blocked → resolve original action (foreign_aid).
        return _resolveAction(s)
      }

      // challenge_window pass → resolve original action.
      return _resolveAction(s)
    }

    // ── LOSE INFLUENCE ───────────────────────────────────────────────────────
    case 'lose_influence': {
      // targetId carries the card index encoded as a string here; the caller
      // should use loseInfluence() directly for clarity.
      throw new Error('Use loseInfluence() to reveal a card')
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

/**
 * Whether the given player is allowed to issue a challenge right now.
 *
 * @param state  - Current game state.
 * @param userId - Player wishing to challenge.
 */
export function canChallenge(state: GameState, userId: string): boolean {
  if (
    state.phase !== 'challenge_window' &&
    state.phase !== 'block_challenge_window'
  )
    return false
  const player = getPlayer(state, userId)
  if (player.isEliminated) return false
  // Cannot challenge your own action or your own block.
  if (state.pendingAction?.actorId === userId) return false
  if (state.pendingAction?.blockerId === userId) return false
  // Deadline must not have passed.
  if (state.challengeDeadline && new Date() > new Date(state.challengeDeadline))
    return false
  return true
}

/**
 * Whether the given player is allowed to declare a block right now.
 *
 * @param state  - Current game state.
 * @param userId - Player wishing to block.
 */
export function canBlock(state: GameState, userId: string): boolean {
  if (state.phase !== 'challenge_window' && state.phase !== 'block_window')
    return false
  const player = getPlayer(state, userId)
  if (player.isEliminated) return false
  const pending = state.pendingAction
  if (!pending) return false
  // Cannot block your own action.
  if (pending.actorId === userId) return false
  // Action must be blockable.
  const blockable = BLOCK_CHARACTERS[pending.action]
  if (!blockable || blockable.length === 0) return false
  // For targeted blocks (assassinate, steal) only the target can block.
  if (
    (pending.action === 'assassinate' || pending.action === 'steal') &&
    pending.targetId !== userId
  )
    return false
  if (state.challengeDeadline && new Date() > new Date(state.challengeDeadline))
    return false
  return true
}

/**
 * Resolve a challenge against the pending action (or block).
 * If the actor holds the claimed character, the challenger loses influence.
 * If not, the actor loses influence and the action is cancelled.
 *
 * @param state       - Current game state (must be in challenge_window or block_challenge_window).
 * @param challengerId - The player challenging.
 */
export function resolveChallenge(
  state: GameState,
  challengerId: string,
): GameState {
  let s = deepClone(state)
  const pending = s.pendingAction
  if (!pending) throw new Error('No pending action to challenge')

  const isChallengeOfBlock = s.phase === 'block_challenge_window' && !!pending.blockerId

  // Who is being challenged and what character do they claim?
  const defenderId = isChallengeOfBlock ? pending.blockerId! : pending.actorId
  const claimedCharacter = isChallengeOfBlock
    ? pending.blockerCharacter!
    : ACTION_CHARACTERS[pending.action]

  if (!claimedCharacter)
    throw new Error(`Action ${pending.action} cannot be challenged`)

  const defender = getPlayer(s, defenderId)
  const matchIndex = defender.cards.findIndex(
    (c) => c.character === claimedCharacter && !c.revealed,
  )

  if (matchIndex !== -1) {
    // Defender DOES hold the card – challengerLoses, challenger reveals.
    // Defender shuffles that card back and draws a new one.
    const [cardBack] = defender.cards.splice(matchIndex, 1)
    s.deck.push(cardBack)
    s.deck = shuffle(s.deck)
    const [newCard] = s.deck.splice(0, 1)
    defender.cards.push(newCard)

    // Challenger must lose influence.
    s.losingInfluenceUserId = challengerId
    s.phase = 'lose_influence'

    // If the challenge was on the block, the block stands → advance turn.
    // (After the challenger loses their card the turn is over.)
    s.pendingAction = {
      ...pending,
      blockBeingChallenged: isChallengeOfBlock,
    }
  } else {
    // Defender does NOT hold the card – they were bluffing.
    s.losingInfluenceUserId = defenderId
    s.phase = 'lose_influence'
    // Mark that this was a failed action so we know NOT to resolve it.
    s.pendingAction = {
      ...pending,
      blockBeingChallenged: false,
    }
  }

  s.challengeDeadline = null
  return s
}

/**
 * Resolve an announced block.
 * Validates the character claimed and opens a challenge window for the block.
 * This is a convenience around applyAction('block').
 *
 * @param state      - Current game state.
 * @param blockerId  - The player who is blocking.
 * @param character  - The character the blocker claims to hold.
 */
export function resolveBlock(
  state: GameState,
  blockerId: string,
  character: Character,
): GameState {
  return applyAction(state, blockerId, 'block', undefined, character)
}

/**
 * Reveal (lose) one of a player's cards by index.
 * Automatically marks the player as eliminated if both cards are now revealed.
 * Advances the turn once influence is lost (or ends the game if only one player remains).
 *
 * @param state     - Current game state (phase must be 'lose_influence').
 * @param userId    - Player who is losing influence.
 * @param cardIndex - 0-based index into the player's cards array.
 */
export function loseInfluence(
  state: GameState,
  userId: string,
  cardIndex: number,
): GameState {
  if (state.phase !== 'lose_influence')
    throw new Error('Not in lose_influence phase')
  if (state.losingInfluenceUserId !== userId)
    throw new Error('It is not your turn to lose influence')

  let s = revealCard(state, userId, cardIndex)
  s.losingInfluenceUserId = null

  // Check for a winner after elimination.
  const winner = checkWinner(s)
  if (winner) {
    s.phase = 'game_over'
    s.winnerId = winner
    s.pendingAction = null
    s.challengeDeadline = null
    return s
  }

  const pending = s.pendingAction

  // Determine what happens next based on why we were losing influence.
  if (!pending) {
    // Coup target – turn simply advances.
    return advanceTurn(s)
  }

  const wasChallengerLosing =
    pending.blockBeingChallenged === undefined
      ? _challengerLost(s, userId, pending)
      : !pending.blockBeingChallenged

  if (wasChallengerLosing) {
    // Challenge failed → resolve the original action (or let block stand).
    if (pending.blockerId) {
      // Block was challenged but challenge failed → block stands → turn over.
      return advanceTurn(s)
    }
    return _resolveAction(s)
  } else {
    // Actor/blocker was bluffing → action is cancelled, turn advances.
    return advanceTurn(s)
  }
}

/**
 * Check whether a single player has won.
 *
 * @param state - Current game state.
 * @returns The userId of the winner, or null if the game continues.
 */
export function checkWinner(state: GameState): string | null {
  const alive = activePlayers(state)
  return alive.length === 1 ? alive[0].userId : null
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL RESOLUTION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fully resolve the pending action (coins, card drawing, etc.) and advance.
 * Called once no challenge / block is raised within the window.
 */
function _resolveAction(state: GameState): GameState {
  let s = deepClone(state)
  const pending = s.pendingAction
  if (!pending) return advanceTurn(s)

  const { actorId, action, targetId } = pending

  switch (action) {
    case 'foreign_aid': {
      s = mutPlayer(s, actorId, (p) => { p.coins += 2 })
      s.treasuryCoins -= 2
      break
    }
    case 'tax': {
      s = mutPlayer(s, actorId, (p) => { p.coins += 3 })
      s.treasuryCoins -= 3
      break
    }
    case 'assassinate': {
      // Coins already deducted; target must now lose influence.
      s.losingInfluenceUserId = targetId!
      s.phase = 'lose_influence'
      s.pendingAction = pending
      s.challengeDeadline = null
      return s
    }
    case 'steal': {
      const target = getPlayer(s, targetId!)
      const stolen = Math.min(2, target.coins)
      s = mutPlayer(s, targetId!, (p) => { p.coins -= stolen })
      s = mutPlayer(s, actorId, (p) => { p.coins += stolen })
      break
    }
    case 'exchange': {
      // Draw 2 cards from deck and add to actor's hand; they must return 2.
      // For simplicity this auto-returns the oldest 2 (a UI layer should let
      // the player choose – replace this with an 'exchange_choice' phase).
      const actor = getPlayer(s, actorId)
      const drawn = s.deck.splice(0, Math.min(2, s.deck.length))
      actor.cards.push(...drawn)
      // Return the first 2 cards.
      const returned = actor.cards.splice(0, 2)
      s.deck.push(...returned)
      s.deck = shuffle(s.deck)
      break
    }
    default:
      break
  }

  return advanceTurn(s)
}

/**
 * Heuristic to decide whether `losingUserId` was the challenger
 * (vs the actor who was bluffing) based on who the pending action references.
 */
function _challengerLost(
  _state: GameState,
  losingUserId: string,
  pending: PendingAction,
): boolean {
  return losingUserId !== pending.actorId && losingUserId !== pending.blockerId
}
