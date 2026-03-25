import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  type GameState,
  type ActionType,
  type Character,
  getValidActions,
  applyAction,
  canChallenge,
  canBlock,
  loseInfluence,
} from '../lib/gameLogic'
import CardComponent from '../components/Card'
import ActionLogComponent, { type ActionLogEntry } from '../components/ActionLog'
import BotEngine from '../components/BotEngine'

/* ── constants ─────────────────────────────── */
const ACTION_LABELS: Partial<Record<ActionType, string>> = {
  income: 'Income  +1💰',
  foreign_aid: 'Foreign Aid  +2💰',
  coup: 'Coup  −7💰',
  tax: 'Tax (Duke)  +3💰',
  assassinate: 'Assassinate  −3💰',
  steal: 'Steal (Captain)',
  exchange: 'Exchange (Ambassador)',
}

const BLOCK_OPTIONS: Partial<Record<ActionType, Character[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
}

const TARGETED: ActionType[] = ['coup', 'assassinate', 'steal']

/* ── helpers ───────────────────────────────── */
function secondsLeft(deadline: string | null): number {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000))
}

/* ── component ─────────────────────────────── */
export default function Game() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  /* auth */
  const [myId, setMyId] = useState<string>(() => localStorage.getItem('coup_guest_id') || '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      if (u) setMyId(u.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      if (u) setMyId(u.id)
      else setMyId(localStorage.getItem('coup_guest_id') || '')
    })
    return () => subscription.unsubscribe()
  }, [])

  /* server state */
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomHostId, setRoomHostId] = useState<string | null>(null)
  const [gsRowId, setGsRowId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Keep a ref to gsRowId so callbacks always have the latest value
  const gsRowIdRef = useRef<string | null>(null)
  useEffect(() => { gsRowIdRef.current = gsRowId }, [gsRowId])

  // Keep a ref to gameState so callbacks always have the latest value
  const gameStateRef = useRef<GameState | null>(null)
  useEffect(() => { gameStateRef.current = gameState }, [gameState])

  // Keep a ref to the name map for action log insertions
  const nameMapRef = useRef<Record<string, string>>({})
  useEffect(() => {
    if (gameState) {
      nameMapRef.current = Object.fromEntries(gameState.players.map(p => [p.userId, p.displayName]))
    }
  }, [gameState])

  /* ui state */
  const [targetAction, setTargetAction] = useState<ActionType | null>(null)
  const [blockCharPicker, setBlockCharPicker] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Fetch + subscribe ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!code) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    const boot = async () => {
      const { data: room } = await supabase.from('rooms').select().eq('code', code).single()
      if (!room) return
      setRoomId(room.id)
      setRoomHostId(room.host_id)

      const { data: gs } = await supabase
        .from('game_state').select().eq('room_id', room.id).single()
      if (!gs) return
      setGsRowId(gs.id)
      gsRowIdRef.current = gs.id

      const state = gs.payload as GameState
      setGameState(state)
      gameStateRef.current = state

      /* existing action log */
      const nameMap = Object.fromEntries(state.players.map(p => [p.userId, p.displayName]))
      nameMapRef.current = nameMap
      const { data: logs } = await supabase
        .from('action_log').select().eq('game_state_id', gs.id).order('created_at')
      if (logs) {
        setActionLog(logs.map(l => ({
          id: l.id,
          actorName: nameMap[l.actor_id] ?? 'Unknown',
          actionType: l.action_type,
          targetName: l.target_id ? (nameMap[l.target_id] ?? 'Unknown') : undefined,
          createdAt: l.created_at,
        })))
      }

      channel = supabase
        .channel(`game-${room.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'game_state',
          filter: `room_id=eq.${room.id}`,
        }, ({ new: row }) => {
          const next = (row as { payload: GameState }).payload
          if (!next || !next.players) return // guard malformed updates
          setGameState(next)
          gameStateRef.current = next
          if (next.phase === 'game_over') navigate(`/results/${code}`)
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'action_log',
          filter: `game_state_id=eq.${gs.id}`,
        }, ({ new: log }) => {
          const l = log as { id: string; actor_id: string; action_type: string; target_id?: string; created_at: string }
          // Use the ref so we always have current player names
          const nm = nameMapRef.current
          setActionLog(prev => {
            if (prev.find(e => e.id === l.id)) return prev
            return [...prev, {
              id: l.id,
              actorName: nm[l.actor_id] ?? 'Unknown',
              actionType: l.action_type,
              targetName: l.target_id ? (nm[l.target_id] ?? 'Unknown') : undefined,
              createdAt: l.created_at,
            }]
          })
        })
        .subscribe()
    }

    boot()
    return () => { channel && supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  /* ── Countdown timer ───────────────────────────────────────────────── */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!gameState?.challengeDeadline) { setCountdown(0); return }

    const tick = () => {
      const s = secondsLeft(gameStateRef.current?.challengeDeadline ?? null)
      setCountdown(s)
      if (s === 0 && timerRef.current) {
        clearInterval(timerRef.current)
        /* actor auto-passes when window expires */
        const gs = gameStateRef.current
        if (gs && gs.currentTurnUserId === myId) {
          applyActionLocally('pass', myId, undefined)
        }
      }
    }
    tick()
    timerRef.current = setInterval(tick, 250)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.challengeDeadline, myId])

  /* ── CORE FIX: Always fetch fresh state from Supabase before mutating ── */
  // This is what prevents the desync crash. Never trust local React state
  // as the base for computing the next state — always re-fetch first.
  const fetchFreshState = useCallback(async (): Promise<{ state: GameState; rowId: string } | null> => {
    const rowId = gsRowIdRef.current
    if (!rowId) return null
    const { data: gs, error } = await supabase
      .from('game_state')
      .select('id, payload')
      .eq('id', rowId)
      .single()
    if (error || !gs || !gs.payload) return null
    return { state: gs.payload as GameState, rowId: gs.id }
  }, [])

  /* ── Write to Supabase ─────────────────────────────────────────────── */
  const commitState = useCallback(async (
    nextState: GameState,
    action: ActionType,
    actorId: string,
    targetId: string | undefined,
    rowId: string,
  ) => {
    // Single atomic write — both payload AND individual columns updated together
    const { error: updateErr } = await supabase.from('game_state').update({
      payload: nextState,
      phase: nextState.phase,
      current_turn_user_id: nextState.currentTurnUserId,
      treasury_coins: nextState.treasuryCoins,
      winner_id: nextState.winnerId,
      losing_influence_user_id: nextState.losingInfluenceUserId,
      updated_at: new Date().toISOString(),
    }).eq('id', rowId)

    if (updateErr) throw new Error(updateErr.message)

    // Log the action (best-effort — don't block on failure)
    await supabase.from('action_log').insert({
      game_state_id: rowId,
      actor_id: actorId,
      action_type: action,
      target_id: targetId ?? null,
      payload: {},
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('action_log insert failed:', logErr.message)
    })
  }, [])

  /* ── Apply action (THE KEY FIX: fetch fresh state first) ───────────── */
  const applyActionLocally = useCallback(async (
    action: ActionType,
    actorId: string,
    targetId?: string,
    character?: Character | string,
  ) => {
    if (loading) return // prevent double-submits
    setLoading(true)
    setError('')

    try {
      // ALWAYS fetch the latest state from DB before computing next state
      // This prevents Player A's stale state from overwriting Player B's move
      const fresh = await fetchFreshState()
      if (!fresh) throw new Error('Could not fetch current game state')

      const { state: currentState, rowId } = fresh

      let nextState: GameState
      if (action === 'lose_influence') {
        nextState = loseInfluence(currentState, actorId, parseInt(targetId ?? '0', 10))
      } else {
        nextState = applyAction(currentState, actorId, action, targetId, character as Character)
      }

      // Update local UI immediately (optimistic)
      setGameState(nextState)
      gameStateRef.current = nextState

      // Reset UI state
      if (actorId === myId) {
        setTargetAction(null)
        setBlockCharPicker(false)
      }

      // Commit to Supabase (realtime will sync all other players)
      await commitState(nextState, action, actorId, targetId, rowId)

    } catch (e: unknown) {
      const msg = (e as Error).message
      if (actorId === myId) setError(msg)
      // Rollback: restore from DB
      const fresh = await fetchFreshState()
      if (fresh) {
        setGameState(fresh.state)
        gameStateRef.current = fresh.state
      }
    } finally {
      setLoading(false)
    }
  }, [loading, myId, fetchFreshState, commitState])

  const handleAction = useCallback(async (
    action: ActionType,
    targetId?: string,
    character?: Character,
  ) => {
    return applyActionLocally(action, myId, targetId, character)
  }, [applyActionLocally, myId])

  const handleLoseInfluence = useCallback(async (cardIndex: number) => {
    return applyActionLocally('lose_influence', myId, cardIndex.toString())
  }, [applyActionLocally, myId])

  // commitAction wrapper for BotEngine compatibility
  const commitAction = useCallback(async (
    _state: GameState, // ignored — bot engine now uses applyActionLocally which fetches fresh
    action: ActionType,
    actorId: string,
    targetId: string | undefined,
  ) => {
    await applyActionLocally(action, actorId, targetId)
  }, [applyActionLocally])

  /* ── Guards ────────────────────────────────────────────────────────── */
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading game…</div>
      </div>
    )
  }

  /* ── Derived ───────────────────────────────────────────────────────── */
  const nameMap = Object.fromEntries(gameState.players.map(p => [p.userId, p.displayName]))
  const myPlayer = gameState.players.find(p => p.userId === myId)
  const opponents = gameState.players.filter(p => p.userId !== myId)
  const isMyTurn = gameState.currentTurnUserId === myId
  const validActs = getValidActions(gameState, myId)
  const pending = gameState.pendingAction
  const iCanChallenge = canChallenge(gameState, myId)
  const iCanBlock = canBlock(gameState, myId)

  const showReactOverlay = ['challenge_window', 'block_window', 'block_challenge_window'].includes(gameState.phase)
  const showLoseModal = gameState.phase === 'lose_influence' && gameState.losingInfluenceUserId === myId

  const blockOpts = pending ? (BLOCK_OPTIONS[pending.action] ?? []) : []

  /* countdown ring */
  const ringPct = gameState.challengeDeadline
    ? Math.max(0, countdown / 7) * 100
    : 100
  const ringColor = countdown <= 2 ? '#ef4444' : countdown <= 4 ? '#f59e0b' : '#22c55e'

  /* ────────────────────────────────────────────────────────────────────
   *  RENDER
   * ───────────────────────────────────────────────────────────────────*/
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">

      {/* Bot Engine Mount */}
      {roomId && roomHostId === myId && (
        <BotEngine
          gameState={gameState}
          hostId={roomHostId}
          myId={myId}
          commitAction={commitAction}
          applyActionLocally={applyActionLocally}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex-shrink-0">
        <span className="text-amber-400 font-black tracking-wider text-lg">COUP</span>
        <span className="text-gray-400 text-sm font-mono">{code}</span>
        <span className="text-sm">
          <span className="text-gray-500">Treasury </span>
          <span className="text-amber-400 font-bold">{gameState.treasuryCoins}💰</span>
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Main area ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">

          {/* Opponents */}
          <div className="flex gap-3 flex-wrap">
            {opponents.map(opp => {
              const isTheirTurn = gameState.currentTurnUserId === opp.userId
              return (
                <div
                  key={opp.userId}
                  className={[
                    'flex-1 min-w-[160px] bg-gray-900 rounded-2xl p-3 border transition-colors',
                    isTheirTurn ? 'border-amber-500 shadow-lg shadow-amber-900/20' : 'border-gray-800',
                    opp.isEliminated ? 'opacity-40 grayscale' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {opp.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{opp.displayName}</div>
                      <div className="text-xs text-amber-400">{opp.coins}💰</div>
                    </div>
                    {isTheirTurn && <span className="text-amber-400 text-xs ml-auto animate-pulse">▶ Turn</span>}
                    {opp.isEliminated && <span className="text-red-400 text-xs ml-auto">Out</span>}
                  </div>
                  <div className="flex gap-2">
                    {opp.cards.map((card, i) => (
                      <CardComponent
                        key={i}
                        card={card}
                        forceHidden={!card.revealed}
                        size="sm"
                        eliminated={opp.isEliminated}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Turn indicator + action buttons */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
            {error && (
              <div className="bg-red-950 border border-red-700 text-red-300 text-sm px-4 py-2 rounded-xl max-w-sm text-center">
                {error}
                <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-300">✕</button>
              </div>
            )}

            {loading && (
              <div className="text-gray-500 text-sm animate-pulse">Processing…</div>
            )}

            {isMyTurn && gameState.phase === 'player_turn' && !loading ? (
              <>
                <div className="text-amber-400 font-bold text-xl">Your Turn</div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {validActs.map(action => (
                    <button
                      key={action}
                      disabled={loading}
                      onClick={() => TARGETED.includes(action) ? setTargetAction(action) : handleAction(action)}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    >
                      {ACTION_LABELS[action] ?? action}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-gray-600 text-base">
                {nameMap[gameState.currentTurnUserId] ?? '…'}&apos;s turn
              </div>
            )}
          </div>

          {/* My hand */}
          {myPlayer && (
            <div className={[
              'bg-gray-900 rounded-2xl p-4 border transition-colors',
              isMyTurn ? 'border-amber-500 shadow-lg shadow-amber-900/20' : 'border-gray-800',
            ].join(' ')}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                  {myPlayer.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{myPlayer.displayName} <span className="text-gray-500 text-xs">(you)</span></div>
                  <div className="text-amber-400 text-sm">{myPlayer.coins}💰</div>
                </div>
                {myPlayer.isEliminated && <span className="text-red-400 text-sm ml-auto">Eliminated</span>}
                {isMyTurn && <span className="text-amber-400 text-xs ml-auto animate-pulse">▶ Your turn</span>}
              </div>
              <div className="flex gap-3">
                {myPlayer.cards.map((card, i) => (
                  <CardComponent key={i} card={card} size="md" alwaysShow={true} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Action log sidebar ───────────────────────────────────── */}
        <aside className="w-56 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Action Log
          </div>
          <div className="flex-1 overflow-hidden">
            <ActionLogComponent entries={actionLog} />
          </div>
        </aside>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
       *  TARGET PICKER MODAL
       * ═══════════════════════════════════════════════════════════════*/}
      {targetAction && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">
              {ACTION_LABELS[targetAction] ?? targetAction}
            </h3>
            <p className="text-gray-500 text-sm mb-4">Choose a target</p>
            <div className="space-y-2">
              {gameState.players
                .filter(p => p.userId !== myId && !p.isEliminated)
                .map(p => (
                  <button
                    key={p.userId}
                    onClick={() => { setTargetAction(null); handleAction(targetAction, p.userId) }}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-amber-600 text-white px-4 py-3 rounded-xl transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold flex-1 text-left">{p.displayName}</span>
                    <span className="text-amber-400 text-sm">{p.coins}💰</span>
                  </button>
                ))}
            </div>
            <button
              onClick={() => setTargetAction(null)}
              className="w-full text-gray-500 hover:text-gray-300 text-sm mt-4 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
       *  CHALLENGE / BLOCK OVERLAY
       * ═══════════════════════════════════════════════════════════════*/}
      {showReactOverlay && !loading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-amber-900/60 shadow-2xl">

            {/* Action description */}
            <div className="text-center mb-4">
              <p className="text-gray-300 text-sm mb-3">
                <span className="font-bold text-white">{nameMap[pending?.actorId ?? ''] ?? '?'}</span>
                {pending?.blockerId
                  ? ` blocks as ${pending.blockerCharacter}`
                  : ` declares ${ACTION_LABELS[pending?.action ?? 'pass'] ?? pending?.action}`}
                {pending?.targetId && (
                  <> → <span className="font-bold text-white">{nameMap[pending.targetId] ?? '?'}</span></>
                )}
              </p>

              {/* Countdown ring */}
              <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
                <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#374151" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke={ringColor} strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - ringPct / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.25s' }}
                  />
                </svg>
                <span className="text-xl font-bold" style={{ color: ringColor }}>{countdown}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {iCanChallenge && (
                <button
                  onClick={() => handleAction('challenge')}
                  disabled={loading}
                  className="w-full bg-red-900 hover:bg-red-800 border border-red-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40"
                >
                  🎯 Challenge
                </button>
              )}

              {iCanBlock && !blockCharPicker && (
                <button
                  onClick={() => blockOpts.length === 1 ? handleAction('block', undefined, blockOpts[0]) : setBlockCharPicker(true)}
                  disabled={loading}
                  className="w-full bg-blue-900 hover:bg-blue-800 border border-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40"
                >
                  🛡️ Block
                </button>
              )}

              {blockCharPicker && (
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-2 text-center">Block with which character?</p>
                  <div className="flex gap-2">
                    {blockOpts.map(char => (
                      <button
                        key={char}
                        onClick={() => { handleAction('block', undefined, char); setBlockCharPicker(false) }}
                        className="flex-1 bg-blue-900 hover:bg-blue-800 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleAction('pass')}
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition-colors disabled:opacity-40"
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
       *  LOSE INFLUENCE MODAL
       * ═══════════════════════════════════════════════════════════════*/}
      {showLoseModal && myPlayer && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-red-900/60 shadow-2xl text-center">
            <div className="text-2xl mb-1">💀</div>
            <h3 className="text-xl font-bold text-red-400 mb-1">Lose Influence</h3>
            <p className="text-gray-500 text-sm mb-6">Choose a card to reveal</p>
            <div className="flex gap-4 justify-center">
              {myPlayer.cards.map((card, i) =>
                !card.revealed ? (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <CardComponent
                      card={card}
                      size="lg"
                      selectable
                      alwaysShow={true}
                      onClick={() => handleLoseInfluence(i)}
                    />
                    <span className="text-xs text-gray-500">{card.character}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}