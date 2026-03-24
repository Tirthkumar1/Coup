import { useEffect } from 'react'
import type { GameState } from '../lib/gameLogic'
import { getBotAction, getBotChallenge, getBotBlock, getBotLoseInfluence } from '../lib/botLogic'

interface BotEngineProps {
  gameState: GameState | null
  hostId: string
  myId: string
  commitAction: (
    state: GameState,
    action: any,
    actorId: string,
    targetId: string | undefined,
    character?: any
  ) => void;
  applyActionLocally: (
    action: any,
    actorId: string,
    targetId?: string,
    character?: any
  ) => void;
}

/**
 * Headless component that watches gameState.
 * ONLY the host runs this engine to avoid duplicate actions.
 */
export default function BotEngine({ gameState, hostId, myId, applyActionLocally }: BotEngineProps) {
  
  useEffect(() => {
    if (!gameState) return
    if (hostId !== myId) return // Only host runs bot logic
    if (gameState.phase === 'game_over' || gameState.phase === 'waiting') return

    const pending = gameState.pendingAction
    const currentPhase = gameState.phase

    // Get all alive bots (IDs starting with 'bot_')
    const activeBots = gameState.players.filter(p => !p.isEliminated && p.userId.startsWith('bot_'))
    if (activeBots.length === 0) return

    let timeoutId: ReturnType<typeof setTimeout>
    const delay = () => 1500 + Math.random() * 1500 // 1.5s to 3s delay

    // Case 1: Active turn
    if (currentPhase === 'player_turn') {
      const activeBot = activeBots.find(b => b.userId === gameState.currentTurnUserId)
      if (activeBot) {
        timeoutId = setTimeout(() => {
          const { action, targetId } = getBotAction(gameState, activeBot.userId)
          applyActionLocally(action, activeBot.userId, targetId, undefined)
        }, delay())
      }
    }

    // Case 2: Lose influence
    else if (currentPhase === 'lose_influence') {
      const losingBot = activeBots.find(b => b.userId === gameState.losingInfluenceUserId)
      if (losingBot) {
        timeoutId = setTimeout(() => {
          const cardIdx = getBotLoseInfluence(gameState, losingBot.userId)
          applyActionLocally('lose_influence', losingBot.userId, cardIdx.toString()) // Game.tsx parses this incorrectly currently, need to fix Game.tsx lose_influence handling for remote execution if we do it via applyAction. Or we can just call loseInfluence() directly via a separate callback.
        }, delay())
      }
    }

    // Case 3: Block / Challenge window
    else if (['challenge_window', 'block_window', 'block_challenge_window'].includes(currentPhase)) {
      // Find a bot that wants to act. We evaluate all bots and see if any want to jump in.
      // If multiple want to, the first one iterated does it.
      
      for (const bot of activeBots) {
        if (bot.userId === pending?.actorId || bot.userId === pending?.blockerId) continue

        // Check blocks
        if (['block_window'].includes(currentPhase)) {
           const blockChar = getBotBlock(gameState, bot.userId)
           if (blockChar) {
             timeoutId = setTimeout(() => applyActionLocally('block', bot.userId, undefined, blockChar), delay())
             break
           }
        }

        // Check challenges
        if (['challenge_window', 'block_challenge_window'].includes(currentPhase)) {
           const challenges = getBotChallenge(gameState, bot.userId)
           if (challenges) {
             timeoutId = setTimeout(() => applyActionLocally('challenge', bot.userId, undefined, undefined), delay())
             break
           }
        }
      }
      
      // If no bot reacted, we do nothing and let the timer run out (which Game.tsx handles).
    }

    return () => clearTimeout(timeoutId)
  }, [gameState, hostId, myId, applyActionLocally])

  return null
}
