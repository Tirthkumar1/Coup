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
  ) => void
  applyActionLocally: (
    action: any,
    actorId: string,
    targetId?: string,
    character?: any
  ) => void
}

/**
 * Headless component — only the host runs bot logic to avoid duplicate actions.
 *
 * Multi-pass robustness: bots that do not wish to challenge/block must
 * explicitly call pass() so passedPlayerIds is updated and the window
 * can close once all eligible players have responded.
 */
export default function BotEngine({ gameState, hostId, myId, applyActionLocally }: BotEngineProps) {

  useEffect(() => {
    if (!gameState) return
    if (hostId !== myId) return
    if (gameState.phase === 'game_over' || gameState.phase === 'waiting') return

    const pending = gameState.pendingAction
    const phase = gameState.phase

    const activeBots = gameState.players.filter(p => !p.isEliminated && p.userId.startsWith('bot_'))
    if (activeBots.length === 0) return

    let timeoutId: ReturnType<typeof setTimeout>
    const delay = () => 1200 + Math.random() * 1200 // 1.2 – 2.4 s

    // ── ACTIVE TURN ─────────────────────────────────────────────────────────
    if (phase === 'player_turn') {
      const activeBot = activeBots.find(b => b.userId === gameState.currentTurnUserId)
      if (activeBot) {
        timeoutId = setTimeout(() => {
          const { action, targetId } = getBotAction(gameState, activeBot.userId)
          applyActionLocally(action, activeBot.userId, targetId, undefined)
        }, delay())
      }

    // ── LOSE INFLUENCE ───────────────────────────────────────────────────────
    } else if (phase === 'lose_influence') {
      const losingBot = activeBots.find(b => b.userId === gameState.losingInfluenceUserId)
      if (losingBot) {
        timeoutId = setTimeout(() => {
          const cardIdx = getBotLoseInfluence(gameState, losingBot.userId)
          applyActionLocally('lose_influence', losingBot.userId, cardIdx.toString())
        }, delay())
      }

    // ── CHALLENGE / BLOCK / BLOCK-CHALLENGE WINDOWS ─────────────────────────
    } else if (['challenge_window', 'block_window', 'block_challenge_window'].includes(phase)) {
      // Evaluate every bot that hasn't already passed.
      // First bot that wants to act does so; all others explicitly pass.
      let actionTaken = false

      for (const bot of activeBots) {
        // Skip if this bot is the actor or blocker (they don't respond to their own action/block).
        if (bot.userId === pending?.actorId || bot.userId === pending?.blockerId) continue
        // Skip if already passed.
        if (gameState.passedPlayerIds.includes(bot.userId)) continue

        if (phase === 'block_window' && !actionTaken) {
          const blockChar = getBotBlock(gameState, bot.userId)
          if (blockChar) {
            timeoutId = setTimeout(() => applyActionLocally('block', bot.userId, undefined, blockChar), delay())
            actionTaken = true
            continue
          }
        }

        if ((phase === 'challenge_window' || phase === 'block_challenge_window') && !actionTaken) {
          if (getBotChallenge(gameState, bot.userId)) {
            timeoutId = setTimeout(() => applyActionLocally('challenge', bot.userId), delay())
            actionTaken = true
            continue
          }
        }

        // Bot has no reaction — explicitly pass so passedPlayerIds is updated.
        const botId = bot.userId
        setTimeout(() => applyActionLocally('pass', botId), delay())
      }

    // ── REVERSAL WINDOW ──────────────────────────────────────────────────────
    } else if (phase === 'reversal_window') {
      // If the actor is a bot, decide: concede (reversal) or allow challenge (pass).
      const actorBot = activeBots.find(b => b.userId === pending?.actorId)
      if (actorBot && !gameState.passedPlayerIds.includes(actorBot.userId)) {
        timeoutId = setTimeout(() => {
          // Bots always allow the challenge window (pass through reversal).
          applyActionLocally('pass', actorBot.userId)
        }, delay())
      }
    }

    return () => clearTimeout(timeoutId)
  }, [gameState, hostId, myId, applyActionLocally])

  return null
}
