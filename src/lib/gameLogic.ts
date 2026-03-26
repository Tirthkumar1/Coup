/**
 * gameLogic.ts — Stack-based Coup engine (v2)
 *
 * Key improvements over v1:
 *  • passedPlayerIds: every eligible player must explicitly pass before a
 *    response window closes — one pass no longer collapses the window.
 *  • reversal_window: after a block is declared the actor can concede
 *    (cancel their own action) before others get to challenge the block.
 *  • postLoseInfluenceEffect: replaces the fragile blockBeingChallenged /
 *    actionFullyResolved flags with an explicit continuation directive.
 *  • Deadline-based auto-advance: if the deadline passes, any subsequent
 *    pass by any eligible player still advances the phase (graceful timeout).
 *  • Third-party challenge: ANY non-blocker player may challenge a block
 *    in block_challenge_window (actor included). Fixed separately earlier.
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
  | 'reversal'
  | 'pass'
  | 'lose_influence'

export type GamePhase =
  | 'waiting'
  | 'player_turn'
  | 'challenge_window'
  | 'block_window'
  | 'reversal_window'
  | 'block_challenge_window'
  | 'lose_influence'
  | 'exchange_choice'
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

/**
 * What the engine should do once the current lose_influence step completes.
 *   advance_turn    – clear pending, move to next player's turn.
 *   continue_action – the pending action is still live; resolve it normally.
 *   block_stands    – a block survived its challenge; cancel the action and advance.
 */
type PostLoseEffect = 'advance_turn' | 'continue_action' | 'block_stands'

export interface PendingAction {
  actorId: string
  action: ActionType
  targetId?: string
  /** Character the blocker claims (populated when block is declared). */
  blockerCharacter?: Character
  blockerId?: string
  /** Tells loseInfluence what to do once the influence-loss step finishes. */
  postLoseEffect?: PostLoseEffect
  /** How many unrevealed cards the actor keeps during an exchange. */
  exchangeKeepCount?: number
}

export interface GameState {
  players: Player[]
  deck: Card[]
  phase: GamePhase
  currentTurnUserId: string
  pendingAction: PendingAction | null
  challengeDeadline: string | null
  treasuryCoins: number
  winnerId: string | null
  losingInfluenceUserId: string | null
  /**
   * IDs of players who have explicitly passed in the current response window.
   * The window closes when every eligible player is in this list (or the
   * challenge deadline has passed).
   */
  passedPlayerIds: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CHARACTERS: Character[] = [
  'Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa',
]

const CHALLENGE_WINDOW_MS = 7_000

const ACTION_CHARACTERS: Partial<Record<ActionType, Character>> = {
  tax: 'Duke',
  assassinate: 'Assassin',
  steal: 'Captain',
  exchange: 'Ambassador',
}

const BLOCK_CHARACTERS: Partial<Record<ActionType, Character[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildFullDeck(): Card[] {
  return CHARACTERS.flatMap(character =>
    Array.from({ length: 3 }, () => ({ character, revealed: false })),
  )
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function getPlayer(state: GameState, userId: string): Player {
  const p = state.players.find(p => p.userId === userId)
  if (!p) throw new Error(`Player ${userId} not found`)
  return p
}

function mutPlayer(state: GameState, userId: string, fn: (p: Player) => void): GameState {
  const s = deepClone(state)
  fn(getPlayer(s, userId))
  return s
}

function activePlayers(state: GameState): Player[] {
  return state.players.filter(p => !p.isEliminated)
}

function nextTurnUserId(state: GameState, afterUserId: string): string {
  const active = activePlayers(state)
  const idx = active.findIndex(p => p.userId === afterUserId)
  return active[(idx + 1) % active.length].userId
}

function challengeDeadlineNow(): string {
  return new Date(Date.now() + CHALLENGE_WINDOW_MS).toISOString()
}

function revealCard(state: GameState, userId: string, cardIndex: number): GameState {
  let s = deepClone(state)
  const player = getPlayer(s, userId)
  if (cardIndex < 0 || cardIndex >= player.cards.length)
    throw new Error('Invalid card index')
  if (player.cards[cardIndex].revealed)
    throw new Error('Card already revealed')
  player.cards[cardIndex].revealed = true
  if (player.cards.every(c => c.revealed)) player.isEliminated = true
  return s
}

function advanceTurn(state: GameState): GameState {
  const s = deepClone(state)
  s.currentTurnUserId = nextTurnUserId(s, s.currentTurnUserId)
  s.pendingAction = null
  s.challengeDeadline = null
  s.passedPlayerIds = []
  s.phase = 'player_turn'
  s.losingInfluenceUserId = null
  return s
}

/**
 * Returns the player IDs who are eligible to respond in the current window.
 * Used to decide when everyone has passed and the window should close.
 */
function eligibleResponders(state: GameState): string[] {
  const pending = state.pendingAction
  const alive = activePlayers(state).map(p => p.userId)

  switch (state.phase) {
    case 'challenge_window':
      // Everyone except the actor may challenge or pass.
      return alive.filter(id => id !== pending?.actorId)

    case 'block_window': {
      if (!pending) return []
      const action = pending.action
      // Targeted blockable actions: only the target can block or pass.
      if (action === 'assassinate' || action === 'steal')
        return alive.filter(id => id === pending.targetId)
      // Foreign aid: everyone except the actor may block or pass.
      return alive.filter(id => id !== pending.actorId)
    }

    case 'reversal_window':
      // Only the actor can concede (reversal) or pass through.
      return pending ? [pending.actorId] : []

    case 'block_challenge_window':
      // Everyone except the blocker may challenge or pass.
      return alive.filter(id => id !== pending?.blockerId)

    default:
      return []
  }
}

/**
 * Checks whether all eligible players have passed in the current window
 * OR the challenge deadline has expired.
 */
function windowShouldClose(state: GameState): boolean {
  const eligible = eligibleResponders(state)
  const allPassed = eligible.every(id => state.passedPlayerIds.includes(id))
  const deadlinePassed =
    !!state.challengeDeadline && new Date() > new Date(state.challengeDeadline)
  return allPassed || deadlinePassed
}

/**
 * Advance to the next phase once the current response window has closed.
 * Resets passedPlayerIds and challengeDeadline.
 */
function advanceWindow(state: GameState): GameState {
  let s = deepClone(state)
  s.passedPlayerIds = []
  s.challengeDeadline = null

  switch (s.phase) {
    case 'challenge_window': {
      const blockable = BLOCK_CHARACTERS[s.pendingAction!.action]
      if (blockable && blockable.length > 0) {
        s.phase = 'block_window'
        s.challengeDeadline = challengeDeadlineNow()
        return s
      }
      return _resolveAction(s)
    }

    case 'block_window':
      // All passed with no block → action goes through.
      return _resolveAction(s)

    case 'reversal_window':
      // Actor did not concede → open block challenge window.
      s.phase = 'block_challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      return s

    case 'block_challenge_window':
      // All passed with no challenge → block stands, action cancelled.
      return advanceTurn(s)

    default:
      return advanceTurn(s)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

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
    passedPlayerIds: [],
  }
}

export function getValidActions(state: GameState, userId: string): ActionType[] {
  if (state.phase !== 'player_turn') return []
  if (state.currentTurnUserId !== userId) return []

  const player = getPlayer(state, userId)
  if (player.isEliminated) return []

  // With 10+ coins the player MUST coup.
  if (player.coins >= 10) return ['coup']

  const actions: ActionType[] = ['income', 'foreign_aid', 'tax', 'exchange']

  if (player.coins >= 7) actions.push('coup')

  if (player.coins >= 3 && activePlayers(state).length > 1)
    actions.push('assassinate')

  const stealTargets = activePlayers(state).filter(
    p => p.userId !== userId && p.coins > 0,
  )
  if (stealTargets.length > 0) actions.push('steal')

  return actions
}

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
      s = mutPlayer(s, userId, p => { p.coins += 1 })
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
      s.passedPlayerIds = []
      return s
    }

    // ── COUP ─────────────────────────────────────────────────────────────────
    case 'coup': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      if (!targetId) throw new Error('coup requires targetId')
      const actor = getPlayer(s, userId)
      if (actor.coins < 7) throw new Error('Need 7 coins to coup')
      s = mutPlayer(s, userId, p => { p.coins -= 7 })
      s.treasuryCoins += 7
      s.pendingAction = { actorId: userId, action: 'coup', targetId }
      s.phase = 'lose_influence'
      s.losingInfluenceUserId = targetId
      s.passedPlayerIds = []
      return s
    }

    // ── TAX ──────────────────────────────────────────────────────────────────
    case 'tax': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      s.pendingAction = { actorId: userId, action: 'tax' }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      s.passedPlayerIds = []
      return s
    }

    // ── ASSASSINATE ──────────────────────────────────────────────────────────
    case 'assassinate': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      if (!targetId) throw new Error('assassinate requires targetId')
      const assassin = getPlayer(s, userId)
      if (assassin.coins < 3) throw new Error('Need 3 coins to assassinate')
      // Cost is paid up front and is non-refundable (spec: assassinate_cost_non_refundable).
      s = mutPlayer(s, userId, p => { p.coins -= 3 })
      s.treasuryCoins += 3
      s.pendingAction = { actorId: userId, action: 'assassinate', targetId }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      s.passedPlayerIds = []
      return s
    }

    // ── STEAL ────────────────────────────────────────────────────────────────
    case 'steal': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      if (!targetId) throw new Error('steal requires targetId')
      s.pendingAction = { actorId: userId, action: 'steal', targetId }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      s.passedPlayerIds = []
      return s
    }

    // ── EXCHANGE ─────────────────────────────────────────────────────────────
    case 'exchange': {
      if (s.phase !== 'player_turn' || s.currentTurnUserId !== userId)
        throw new Error('Not your turn')
      s.pendingAction = { actorId: userId, action: 'exchange' }
      s.phase = 'challenge_window'
      s.challengeDeadline = challengeDeadlineNow()
      s.passedPlayerIds = []
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
      s.pendingAction = { ...pending, blockerId: userId, blockerCharacter: character }
      // Spec: AFTER_BLOCK_BEFORE_BLOCK_CHALLENGE → reversal_window for actor.
      s.phase = 'reversal_window'
      s.challengeDeadline = challengeDeadlineNow()
      s.passedPlayerIds = []
      return s
    }

    // ── REVERSAL (actor concedes after a block) ───────────────────────────────
    case 'reversal': {
      if (s.phase !== 'reversal_window')
        throw new Error('Not in reversal window')
      if (s.pendingAction?.actorId !== userId)
        throw new Error('Only the actor can concede')
      // Cancel action cleanly — no influence loss, no card reveal.
      return advanceTurn(s)
    }

    // ── PASS ─────────────────────────────────────────────────────────────────
    case 'pass': {
      const eligible = eligibleResponders(s)
      if (!eligible.includes(userId))
        throw new Error('You cannot pass in this phase')
      if (s.passedPlayerIds.includes(userId))
        throw new Error('Already passed')

      s.passedPlayerIds = [...s.passedPlayerIds, userId]

      if (windowShouldClose(s)) {
        return advanceWindow(s)
      }
      return s
    }

    case 'lose_influence':
      throw new Error('Use loseInfluence() to reveal a card')

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTIVE PREDICATES
// ─────────────────────────────────────────────────────────────────────────────

export function canChallenge(state: GameState, userId: string): boolean {
  if (
    state.phase !== 'challenge_window' &&
    state.phase !== 'block_challenge_window'
  ) return false
  const player = getPlayer(state, userId)
  if (player.isEliminated) return false
  // Cannot challenge your own block.
  if (state.pendingAction?.blockerId === userId) return false
  // In challenge_window, cannot challenge your own action.
  if (state.phase === 'challenge_window' && state.pendingAction?.actorId === userId) return false
  if (state.passedPlayerIds.includes(userId)) return false
  if (state.challengeDeadline && new Date() > new Date(state.challengeDeadline)) return false
  return true
}

export function canBlock(state: GameState, userId: string): boolean {
  if (state.phase !== 'block_window') return false
  const player = getPlayer(state, userId)
  if (player.isEliminated) return false
  const pending = state.pendingAction
  if (!pending) return false
  if (pending.actorId === userId) return false
  const blockable = BLOCK_CHARACTERS[pending.action]
  if (!blockable || blockable.length === 0) return false
  if (
    (pending.action === 'assassinate' || pending.action === 'steal') &&
    pending.targetId !== userId
  ) return false
  if (state.passedPlayerIds.includes(userId)) return false
  if (state.challengeDeadline && new Date() > new Date(state.challengeDeadline)) return false
  return true
}

export function canReversal(state: GameState, userId: string): boolean {
  if (state.phase !== 'reversal_window') return false
  return state.pendingAction?.actorId === userId
}

export function canPassIn(state: GameState, userId: string): boolean {
  const eligible = eligibleResponders(state)
  if (!eligible.includes(userId)) return false
  if (state.passedPlayerIds.includes(userId)) return false
  if (state.challengeDeadline && new Date() > new Date(state.challengeDeadline)) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

export function resolveChallenge(state: GameState, challengerId: string): GameState {
  let s = deepClone(state)
  const pending = s.pendingAction
  if (!pending) throw new Error('No pending action to challenge')

  const isChallengeOfBlock = s.phase === 'block_challenge_window' && !!pending.blockerId

  const defenderId = isChallengeOfBlock ? pending.blockerId! : pending.actorId
  const claimedCharacter = isChallengeOfBlock
    ? pending.blockerCharacter!
    : ACTION_CHARACTERS[pending.action]

  if (!claimedCharacter)
    throw new Error(`Action ${pending.action} cannot be challenged`)

  const defender = getPlayer(s, defenderId)
  const matchIndex = defender.cards.findIndex(c => c.character === claimedCharacter && !c.revealed)

  s.challengeDeadline = null
  s.passedPlayerIds = []

  if (matchIndex !== -1) {
    // Defender holds the card — challenger loses, card returned and redrawn.
    const [cardBack] = defender.cards.splice(matchIndex, 1)
    s.deck.push(cardBack)
    s.deck = shuffle(s.deck)
    const [newCard] = s.deck.splice(0, 1)
    defender.cards.push(newCard)

    s.losingInfluenceUserId = challengerId
    s.phase = 'lose_influence'
    s.pendingAction = {
      ...pending,
      // If block was challenged and block survived → block stands after lose.
      postLoseEffect: isChallengeOfBlock ? 'block_stands' : 'continue_action',
    }
  } else {
    // Defender was bluffing — they lose influence, action/block is cancelled.
    s.losingInfluenceUserId = defenderId
    s.phase = 'lose_influence'
    s.pendingAction = {
      ...pending,
      postLoseEffect: 'advance_turn',
    }
  }

  return s
}

// ─────────────────────────────────────────────────────────────────────────────
// INFLUENCE LOSS
// ─────────────────────────────────────────────────────────────────────────────

export function loseInfluence(state: GameState, userId: string, cardIndex: number): GameState {
  if (state.phase !== 'lose_influence')
    throw new Error('Not in lose_influence phase')
  if (state.losingInfluenceUserId !== userId)
    throw new Error('It is not your turn to lose influence')

  let s = revealCard(state, userId, cardIndex)
  s.losingInfluenceUserId = null

  const winner = checkWinner(s)
  if (winner) {
    s.phase = 'game_over'
    s.winnerId = winner
    s.pendingAction = null
    s.challengeDeadline = null
    return s
  }

  const pending = s.pendingAction

  // Coup or no pending action → just end the turn.
  if (!pending || pending.action === 'coup') return advanceTurn(s)

  // Use the explicit post-lose directive if set.
  switch (pending.postLoseEffect) {
    case 'advance_turn':  return advanceTurn(s)
    case 'block_stands':  return advanceTurn(s)
    case 'continue_action': return _resolveAction(s)
  }

  // Legacy fallback (should not be reached in the new engine).
  return advanceTurn(s)
}

export function checkWinner(state: GameState): string | null {
  const alive = activePlayers(state)
  return alive.length === 1 ? alive[0].userId : null
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

function _resolveAction(state: GameState): GameState {
  let s = deepClone(state)
  const pending = s.pendingAction
  if (!pending) return advanceTurn(s)

  const { actorId, action, targetId } = pending

  switch (action) {
    case 'foreign_aid': {
      s = mutPlayer(s, actorId, p => { p.coins += 2 })
      s.treasuryCoins -= 2
      break
    }
    case 'tax': {
      s = mutPlayer(s, actorId, p => { p.coins += 3 })
      s.treasuryCoins -= 3
      break
    }
    case 'assassinate': {
      // Cost already paid. Target loses an influence card.
      s.losingInfluenceUserId = targetId!
      s.phase = 'lose_influence'
      s.pendingAction = { ...pending, postLoseEffect: 'advance_turn' }
      s.challengeDeadline = null
      return s
    }
    case 'steal': {
      const target = getPlayer(s, targetId!)
      const stolen = Math.min(2, target.coins)
      s = mutPlayer(s, targetId!, p => { p.coins -= stolen })
      s = mutPlayer(s, actorId, p => { p.coins += stolen })
      break
    }
    case 'exchange': {
      const actor = getPlayer(s, actorId)
      const unrevealedBefore = actor.cards.filter(c => !c.revealed).length
      const drawn = s.deck.splice(0, Math.min(2, s.deck.length))
      actor.cards.push(...drawn)
      s.phase = 'exchange_choice'
      s.pendingAction = { ...pending, postLoseEffect: 'advance_turn', exchangeKeepCount: unrevealedBefore }
      s.challengeDeadline = null
      return s
    }
    default:
      break
  }

  return advanceTurn(s)
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCHANGE COMPLETION
// ─────────────────────────────────────────────────────────────────────────────

export function chooseExchangeCards(
  state: GameState,
  userId: string,
  keepIndices: number[],
): GameState {
  if (state.phase !== 'exchange_choice')
    throw new Error('Not in exchange_choice phase')
  const pending = state.pendingAction
  if (!pending || pending.actorId !== userId)
    throw new Error('Not your exchange to resolve')

  let s = deepClone(state)
  const actor = getPlayer(s, userId)

  const mustKeep = pending.exchangeKeepCount ?? 2
  if (keepIndices.length !== mustKeep)
    throw new Error(`Must keep exactly ${mustKeep} cards`)

  const idxSet = new Set(keepIndices)
  if (idxSet.size !== mustKeep) throw new Error('Duplicate card indices')
  keepIndices.forEach(i => {
    if (i < 0 || i >= actor.cards.length) throw new Error(`Invalid card index ${i}`)
    if (actor.cards[i].revealed) throw new Error('Cannot keep a revealed card')
  })

  const kept = keepIndices.map(i => actor.cards[i])
  const returned = actor.cards.filter((_, i) => !idxSet.has(i))

  actor.cards = kept
  s.deck.push(...returned)
  s.deck = shuffle(s.deck)

  return advanceTurn(s)
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY COMPAT
// ─────────────────────────────────────────────────────────────────────────────

/** Convenience wrapper kept for callers that still use resolveBlock. */
export function resolveBlock(state: GameState, blockerId: string, character: Character): GameState {
  return applyAction(state, blockerId, 'block', undefined, character)
}
