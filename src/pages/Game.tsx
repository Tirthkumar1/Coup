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
  chooseExchangeCards,
} from '../lib/gameLogic'
import BotEngine from '../components/BotEngine'
import { type ActionLogEntry } from '../components/ActionLog'
import { NOIR_STYLES, S } from '../components/game/GameStyles'
import GameHeader from '../components/game/GameHeader'
import OpponentsGrid from '../components/game/OpponentsGrid'
import BattlefieldSection from '../components/game/BattlefieldSection'
import PlayerHand from '../components/game/PlayerHand'
import ActionGrid from '../components/game/ActionGrid'
import TargetPicker from '../components/game/TargetPicker'
import LoseInfluenceOverlay from '../components/game/LoseInfluenceOverlay'
import ExchangeChoiceOverlay from '../components/game/ExchangeChoiceOverlay'
import IntelDrawer from '../components/game/IntelDrawer'
import GameNav from '../components/game/GameNav'

export default function Game() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  /* auth */
  const [myId, setMyId] = useState<string>(() => localStorage.getItem('coup_guest_id') || '')
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session?.user) setMyId(data.session.user.id) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) setMyId(s.user.id)
      else setMyId(localStorage.getItem('coup_guest_id') || '')
    })
    return () => subscription.unsubscribe()
  }, [])

  /* state */
  const [roomHostId, setRoomHostId] = useState<string | null>(null)
  const [gsRowId, setGsRowId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [targetAction, setTargetAction] = useState<ActionType | null>(null)
  const [blockCharPicker, setBlockCharPicker] = useState(false)

  const gsRowIdRef = useRef<string | null>(null)
  const gameStateRef = useRef<GameState | null>(null)
  const nameMapRef = useRef<Record<string, string>>({})
  useEffect(() => { gsRowIdRef.current = gsRowId }, [gsRowId])
  useEffect(() => { gameStateRef.current = gameState }, [gameState])
  useEffect(() => {
    if (gameState) nameMapRef.current = Object.fromEntries(gameState.players.map(p => [p.userId, p.displayName]))
  }, [gameState])

  /* boot */
  useEffect(() => {
    if (!code) return
    let ch: ReturnType<typeof supabase.channel> | null = null
    const boot = async () => {
      const { data: room } = await supabase.from('rooms').select().eq('code', code).single()
      if (!room) return
      setRoomHostId(room.host_id)
      const { data: gs } = await supabase.from('game_state').select().eq('room_id', room.id).single()
      if (!gs) return
      setGsRowId(gs.id); gsRowIdRef.current = gs.id
      const st = gs.payload as GameState
      setGameState(st); gameStateRef.current = st
      const nm = Object.fromEntries(st.players.map((p: { userId: string; displayName: string }) => [p.userId, p.displayName]))
      nameMapRef.current = nm
      const { data: logs } = await supabase.from('action_log').select().eq('game_state_id', gs.id).order('created_at')
      if (logs) setActionLog(logs.map(l => ({ id: l.id, actorName: nm[l.actor_id] ?? '?', actionType: l.action_type, targetName: l.target_id ? nm[l.target_id] ?? '?' : undefined, createdAt: l.created_at })))

      ch = supabase.channel(`game-${room.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state', filter: `room_id=eq.${room.id}` },
          ({ new: row }) => {
            const next = (row as { payload: GameState }).payload
            if (!next?.players) return
            setGameState(next); gameStateRef.current = next
            if (next.phase === 'game_over') navigate(`/results/${code}`)
          })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'action_log', filter: `game_state_id=eq.${gs.id}` },
          ({ new: log }) => {
            const l = log as { id: string; actor_id: string; action_type: string; target_id?: string; created_at: string }
            const nm2 = nameMapRef.current
            setActionLog(prev => prev.find(e => e.id === l.id) ? prev : [...prev, { id: l.id, actorName: nm2[l.actor_id] ?? '?', actionType: l.action_type, targetName: l.target_id ? nm2[l.target_id] ?? '?' : undefined, createdAt: l.created_at }])
          })
        .subscribe()
    }
    boot()
    return () => { ch && supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  /* core action machinery */
  const fetchFresh = useCallback(async () => {
    const rowId = gsRowIdRef.current
    if (!rowId) return null
    const { data: gs } = await supabase.from('game_state').select('id,payload').eq('id', rowId).single()
    if (!gs?.payload) return null
    return { state: gs.payload as GameState, rowId: gs.id }
  }, [])

  const commitState = useCallback(async (next: GameState, action: ActionType, actorId: string, targetId: string | undefined, rowId: string) => {
    await supabase.from('game_state').update({ payload: next, phase: next.phase, current_turn_user_id: next.currentTurnUserId, treasury_coins: next.treasuryCoins, winner_id: next.winnerId, losing_influence_user_id: next.losingInfluenceUserId, updated_at: new Date().toISOString() }).eq('id', rowId)
    await supabase.from('action_log').insert({ game_state_id: rowId, actor_id: actorId, action_type: action, target_id: targetId ?? null, payload: {} })
  }, [])

  const applyActionLocally = useCallback(async (action: ActionType, actorId: string, targetId?: string, character?: Character | string) => {
    if (loading) return
    setLoading(true); setError('')
    try {
      const fresh = await fetchFresh()
      if (!fresh) throw new Error('Could not fetch game state')
      const next = action === 'lose_influence'
        ? loseInfluence(fresh.state, actorId, parseInt(targetId ?? '0', 10))
        : applyAction(fresh.state, actorId, action, targetId, character as Character)
      setGameState(next); gameStateRef.current = next
      if (actorId === myId) { setTargetAction(null); setBlockCharPicker(false) }
      await commitState(next, action, actorId, targetId, fresh.rowId)
    } catch (e: unknown) {
      if (actorId === myId) setError((e as Error).message)
      const fresh = await fetchFresh()
      if (fresh) { setGameState(fresh.state); gameStateRef.current = fresh.state }
    } finally { setLoading(false) }
  }, [loading, myId, fetchFresh, commitState])

  const handleAction = useCallback((action: ActionType, targetId?: string, character?: Character) =>
    applyActionLocally(action, myId, targetId, character), [applyActionLocally, myId])
  const handleLose = useCallback((i: number) => applyActionLocally('lose_influence', myId, i.toString()), [applyActionLocally, myId])

  const handleExchangeChoice = useCallback(async (keepIndices: number[]) => {
    if (loading) return
    setLoading(true); setError('')
    try {
      const fresh = await fetchFresh()
      if (!fresh) throw new Error('Could not fetch game state')
      const next = chooseExchangeCards(fresh.state, myId, keepIndices)
      setGameState(next); gameStateRef.current = next
      await commitState(next, 'exchange' as ActionType, myId, undefined, fresh.rowId)
    } catch (e: unknown) {
      setError((e as Error).message)
      const fresh = await fetchFresh()
      if (fresh) { setGameState(fresh.state); gameStateRef.current = fresh.state }
    } finally { setLoading(false) }
  }, [loading, myId, fetchFresh, commitState])
  const commitAction = useCallback(async (_s: GameState, action: ActionType, actorId: string, targetId: string | undefined) =>
    applyActionLocally(action, actorId, targetId), [applyActionLocally])

  /* loading screen */
  if (!gameState) return (
    <>
      <style>{NOIR_STYLES}</style>
      <div style={{ minHeight: '100dvh', background: '#131313', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '2px solid #c80815', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: 'Space Grotesk,sans-serif', color: '#5d3f3c', fontSize: 10, letterSpacing: '0.2em' }}>ESTABLISHING CONNECTION</p>
      </div>
    </>
  )

  /* derived */
  const nameMap = Object.fromEntries(gameState.players.map(p => [p.userId, p.displayName]))
  const isMyTurn = gameState.currentTurnUserId === myId
  const validActs = getValidActions(gameState, myId)
  const myPlayer = gameState.players.find(p => p.userId === myId)
  const iCanChallenge = canChallenge(gameState, myId)
  const iCanBlock = canBlock(gameState, myId)
  const showLose = gameState.phase === 'lose_influence' && gameState.losingInfluenceUserId === myId
  const showExchange = gameState.phase === 'exchange_choice' && gameState.pendingAction?.actorId === myId

  return (
    <>
      <style>{NOIR_STYLES}</style>
      <div style={S.root}>

        <GameHeader
          code={code}
          treasuryCoins={gameState.treasuryCoins}
          showLog={showLog}
          onToggleLog={() => setShowLog(v => !v)}
        />

        {/* bot engine — only host runs bots */}
        {roomHostId === myId && (
          <BotEngine gameState={gameState} hostId={roomHostId} myId={myId} commitAction={commitAction} applyActionLocally={applyActionLocally} />
        )}

        <main style={S.main} className="scroll-hide">
          <OpponentsGrid gameState={gameState} myId={myId} />

          <BattlefieldSection
            gameState={gameState}
            nameMap={nameMap}
            myId={myId}
            isMyTurn={isMyTurn}
            iCanChallenge={iCanChallenge}
            iCanBlock={iCanBlock}
            blockCharPicker={blockCharPicker}
            setBlockCharPicker={setBlockCharPicker}
            loading={loading}
            error={error}
            onClearError={() => setError('')}
            onAction={handleAction}
          />

          <PlayerHand gameState={gameState} myId={myId} />

          {isMyTurn && gameState.phase === 'player_turn' && !myPlayer?.isEliminated && (
            <ActionGrid
              validActions={validActs}
              loading={loading}
              error={error}
              onClearError={() => setError('')}
              onAction={action => handleAction(action)}
              onTargetAction={action => setTargetAction(action)}
            />
          )}
        </main>

        <GameNav
          showLog={showLog}
          onNavigateHome={() => navigate('/')}
          onToggleLog={() => setShowLog(v => !v)}
        />

        {targetAction && (
          <TargetPicker
            gameState={gameState}
            myId={myId}
            targetAction={targetAction}
            onSelect={(action, targetId) => { setTargetAction(null); handleAction(action, targetId) }}
            onCancel={() => setTargetAction(null)}
          />
        )}

        {showLose && (
          <LoseInfluenceOverlay
            gameState={gameState}
            myId={myId}
            onLose={handleLose}
          />
        )}

        {showExchange && (
          <ExchangeChoiceOverlay
            gameState={gameState}
            myId={myId}
            onChoose={handleExchangeChoice}
          />
        )}

        {showLog && (
          <IntelDrawer entries={actionLog} onClose={() => setShowLog(false)} />
        )}

      </div>
    </>
  )
}
