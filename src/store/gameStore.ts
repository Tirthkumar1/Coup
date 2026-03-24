// Game state store – expand with Zustand or similar as the game grows.

export interface GameState {
  roomCode: string | null
  playerId: string | null
  players: string[]
}

export const initialGameState: GameState = {
  roomCode: null,
  playerId: null,
  players: [],
}
