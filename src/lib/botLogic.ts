import {
  type ActionType,
  type Character,
  type GameState,
  getValidActions,
  canChallenge,
  canBlock,
} from './gameLogic'

function rand(chance: number): boolean {
  return Math.random() < chance
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function hasCharacter(state: GameState, userId: string, character: Character): boolean {
  const p = state.players.find(p => p.userId === userId)
  if (!p) return false
  return p.cards.some(c => !c.revealed && c.character === character)
}

function getAliveOpponents(state: GameState, myId: string) {
  return state.players.filter(p => p.userId !== myId && !p.isEliminated)
}

function getRichestOpponent(state: GameState, myId: string) {
  const opps = getAliveOpponents(state, myId)
  if (opps.length === 0) return null
  return opps.reduce((a, b) => (a.coins > b.coins ? a : b))
}

export function getBotAction(state: GameState, myId: string): { action: ActionType; targetId?: string } {
  const p = state.players.find(p => p.userId === myId)
  if (!p || p.isEliminated) return { action: 'pass' }

  const valid = getValidActions(state, myId)

  if (valid.includes('coup')) {
    const target = getRichestOpponent(state, myId)
    return { action: 'coup', targetId: target?.userId }
  }

  if (valid.includes('assassinate') && hasCharacter(state, myId, 'Assassin')) {
    const target = getRichestOpponent(state, myId)
    return { action: 'assassinate', targetId: target?.userId }
  }

  if (valid.includes('tax') && hasCharacter(state, myId, 'Duke')) {
    return { action: 'tax' }
  }

  if (valid.includes('steal') && hasCharacter(state, myId, 'Captain')) {
    const target = getRichestOpponent(state, myId)
    if (target && target.coins > 0) return { action: 'steal', targetId: target.userId }
  }

  if (valid.includes('tax') && rand(0.3)) return { action: 'tax' }
  if (valid.includes('assassinate') && rand(0.15)) {
    const target = getRichestOpponent(state, myId)
    return { action: 'assassinate', targetId: target?.userId }
  }

  if (valid.includes('foreign_aid') && rand(0.7)) return { action: 'foreign_aid' }

  return { action: 'income' }
}

export function getBotChallenge(state: GameState, myId: string): boolean {
  if (!canChallenge(state, myId)) return false
  return rand(0.15)
}

export function getBotBlock(state: GameState, myId: string): Character | null {
  if (!canBlock(state, myId)) return null
  const pending = state.pendingAction
  if (!pending) return null

  if (pending.action === 'foreign_aid' && hasCharacter(state, myId, 'Duke')) return 'Duke'
  if (pending.action === 'assassinate' && hasCharacter(state, myId, 'Contessa')) return 'Contessa'
  if (pending.action === 'steal') {
    if (hasCharacter(state, myId, 'Captain')) return 'Captain'
    if (hasCharacter(state, myId, 'Ambassador')) return 'Ambassador'
  }

  if (pending.action === 'foreign_aid' && rand(0.2)) return 'Duke'
  if (pending.action === 'assassinate' && rand(0.4)) return 'Contessa'
  if (pending.action === 'steal' && rand(0.3)) return randChoice(['Captain', 'Ambassador'])

  return null
}

export function getBotLoseInfluence(state: GameState, myId: string): number {
  const p = state.players.find(p => p.userId === myId)
  if (!p) return 0
  const unrevealed = p.cards.map((c, i) => ({ ...c, i })).filter(c => !c.revealed)
  if (unrevealed.length === 0) return 0
  return randChoice(unrevealed).i
}
