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

/* ─── Noir styles injected once ─────────────────────────────────────────── */
const NOIR_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;700&display=swap');
*{box-sizing:border-box}
body{margin:0;background:#131313}
.chamfer-sm{clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}
.chamfer-md{clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
.chamfer-lg{clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)}
.chamfer-btn{clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))}
.action-btn{font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;padding:12px 8px;background:#1c1b1b;color:#e5e2e1;border:none;cursor:pointer;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);border-bottom:1px solid #2a2a2a;transition:background .15s,box-shadow .15s}
.action-btn:hover:not(:disabled){background:#2a2a2a;box-shadow:0 0 20px rgba(246,190,59,.15)}
.action-btn:disabled{opacity:.35;cursor:not-allowed}
.action-btn.danger{color:#ffb4ab;border-bottom-color:rgba(200,8,21,.4)}
.action-btn.danger:hover:not(:disabled){background:rgba(200,8,21,.15);box-shadow:0 0 20px rgba(200,8,21,.2)}
.action-btn.primary{background:linear-gradient(135deg,#c80815,#93000a);color:#ffd7d2;font-weight:700;border-bottom:none}
.action-btn.primary:hover:not(:disabled){background:linear-gradient(135deg,#e00a1a,#c80815);box-shadow:0 0 20px rgba(200,8,21,.35)}
.react-btn{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;padding:14px 24px;border:none;cursor:pointer;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));transition:all .15s}
.react-btn.challenge{background:linear-gradient(135deg,#c80815,#93000a);color:#ffd7d2}
.react-btn.challenge:hover{background:linear-gradient(135deg,#e00a1a,#c80815);box-shadow:0 0 24px rgba(200,8,21,.4)}
.react-btn.block{background:transparent;border:1px solid #5d3f3c;color:#e6bdb8}
.react-btn.block:hover{background:rgba(93,63,60,.2);box-shadow:0 0 20px rgba(246,190,59,.2)}
.react-btn.pass{background:transparent;border:1px solid #2a2a2a;color:#5d3f3c}
.react-btn.pass:hover{background:#1c1b1b;color:#ad8883}
.react-btn:disabled{opacity:.35;cursor:not-allowed}
.influence-card{position:relative;background:#1c1b1b;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);overflow:hidden;transition:transform .2s,box-shadow .2s}
.influence-card.selectable{cursor:pointer;border:1px solid #c80815}
.influence-card.selectable:hover{box-shadow:0 0 20px rgba(200,8,21,.3);transform:translateY(-2px)}
.scroll-hide{scrollbar-width:none}
.scroll-hide::-webkit-scrollbar{display:none}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-in{animation:fadeIn .3s ease forwards}
.glass{backdrop-filter:blur(12px);background:rgba(32,31,31,.9)}
.opp-card{background:#1c1b1b;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);padding:12px;position:relative;overflow:hidden;transition:opacity .3s}
.target-row{display:flex;align-items:center;gap:12px;background:#2a2a2a;border:none;color:#e5e2e1;padding:12px 14px;cursor:pointer;transition:all .15s;text-align:left;width:100%;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}
.target-row:hover{background:#353534;box-shadow:0 0 16px rgba(200,8,21,.2)}
`

/* ─── Types ─────────────────────────────────────────────────────────────── */
const ACTION_LABELS: Partial<Record<ActionType, string>> = {
  income: 'INCOME', foreign_aid: 'FOREIGN AID', coup: 'COUP',
  tax: 'TAX', assassinate: 'ASSASSINATE', steal: 'STEAL', exchange: 'EXCHANGE',
}
const BLOCK_OPTIONS: Partial<Record<ActionType, Character[]>> = {
  foreign_aid: ['Duke'], assassinate: ['Contessa'], steal: ['Captain', 'Ambassador'],
}
const TARGETED: ActionType[] = ['coup', 'assassinate', 'steal']

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function Pips({ count, dead }: { count: number; dead: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 8, height: 12,
          clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)',
          background: dead ? '#93000a' : i < count ? '#c80815' : '#2a2a2a',
        }} />
      ))}
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
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
  const myPlayer = gameState.players.find(p => p.userId === myId)
  const opponents = gameState.players.filter(p => p.userId !== myId)
  const isMyTurn = gameState.currentTurnUserId === myId
  const validActs = getValidActions(gameState, myId)
  const pending = gameState.pendingAction
  const iCanChallenge = canChallenge(gameState, myId)
  const iCanBlock = canBlock(gameState, myId)
  const showReact = ['challenge_window', 'block_window', 'block_challenge_window'].includes(gameState.phase)
  const showLose = gameState.phase === 'lose_influence' && gameState.losingInfluenceUserId === myId
  const blockOpts = pending ? (BLOCK_OPTIONS[pending.action] ?? []) : []

  const pendingLabel = pending?.blockerId
    ? `${nameMap[pending.blockerId]?.toUpperCase() ?? '?'} BLOCKS AS ${pending.blockerCharacter?.toUpperCase()}`
    : `${nameMap[pending?.actorId ?? '']?.toUpperCase() ?? '?'} CLAIMS ${pending?.action === 'tax' ? 'DUKE' : pending?.action === 'assassinate' ? 'ASSASSIN' : pending?.action === 'steal' ? 'CAPTAIN' : pending?.action === 'exchange' ? 'AMBASSADOR' : pending?.action === 'foreign_aid' ? 'FOREIGN AID' : (pending?.action ?? '').toUpperCase()}`

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  const S = {
    root: { minHeight: '100dvh', background: '#131313', display: 'flex', flexDirection: 'column' as const, fontFamily: 'Space Grotesk,sans-serif', color: '#e5e2e1', overflowX: 'hidden' as const },
    header: { background: 'rgba(14,14,14,.9)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(93,63,60,.2)', position: 'sticky' as const, top: 0, zIndex: 50, flexShrink: 0 },
    main: { flex: 1, overflowY: 'auto' as const, padding: '14px 14px 100px', display: 'flex', flexDirection: 'column' as const, gap: 10 },
    nav: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(14,14,14,.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(93,63,60,.2)', padding: '8px 0 12px' },
    navInner: { display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
    navBtn: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: '#353534', padding: 8, transition: 'color .2s', fontFamily: 'Space Grotesk,sans-serif' },
    navActive: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, background: '#1c1b1b', padding: '8px 16px', color: '#f6be3b', fontFamily: 'Space Grotesk,sans-serif' },
    mono: { fontFamily: 'Inter,monospace' },
    serif: { fontFamily: 'Newsreader,serif', fontStyle: 'italic' as const },
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24, backdropFilter: 'blur(4px)' },
  }

  return (
    <>
      <style>{NOIR_STYLES}</style>
      <div style={S.root}>

        {/* header */}
        <header style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#c80815', fontSize: 13, fontWeight: 800 }}>{'>'}_</span>
            <div>
              <div style={{ color: '#c80815', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>ROOM: {code}</div>
              <div style={{ color: '#5d3f3c', fontSize: 9, ...S.mono, letterSpacing: '0.1em' }}>SESSION ACTIVE · OPERATION NOIR</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#5d3f3c', fontSize: 9, ...S.mono, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Treasury</div>
              <div style={{ color: '#f6be3b', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>{gameState.treasuryCoins} GOLD</div>
            </div>
            <button onClick={() => setShowLog(v => !v)} className="chamfer-sm" style={{ background: showLog ? '#1c1b1b' : 'none', border: '1px solid #2a2a2a', color: showLog ? '#f6be3b' : '#5d3f3c', cursor: 'pointer', padding: '6px 10px', fontSize: 9, letterSpacing: '0.15em', fontFamily: 'Space Grotesk,sans-serif', textTransform: 'uppercase' }}>
              INTEL
            </button>
          </div>
        </header>

        {/* bot engine */}
        {roomHostId === myId && (
          <BotEngine gameState={gameState} hostId={roomHostId} myId={myId} commitAction={commitAction} applyActionLocally={applyActionLocally} />
        )}

        {/* main */}
        <main style={S.main} className="scroll-hide">

          {/* opponents */}
          <div style={{ display: 'grid', gridTemplateColumns: opponents.length === 1 ? '1fr' : 'repeat(2,1fr)', gap: 8 }}>
            {opponents.map((opp, idx) => {
              const active = gameState.currentTurnUserId === opp.userId
              const alive = opp.cards.filter(c => !c.revealed).length
              return (
                <div key={opp.userId} className="opp-card chamfer-sm" style={{ borderLeft: idx % 2 === 0 ? '2px solid #c80815' : 'none', borderRight: idx % 2 === 1 ? '2px solid #f6be3b' : 'none', opacity: opp.isEliminated ? 0.4 : 1, filter: opp.isEliminated ? 'grayscale(1)' : 'none' }}>
                  {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,#f6be3b,transparent)' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    {idx % 2 === 0 ? (
                      <>
                        <div>
                          <p style={{ ...S.serif, fontSize: 13, color: '#e5e2e1', margin: '0 0 4px' }}>{opp.displayName}</p>
                          <Pips count={alive} dead={opp.isEliminated} />
                        </div>
                        <div className="chamfer-sm" style={{ width: 36, height: 36, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#5d3f3c' }}>
                          {opp.displayName.charAt(0).toUpperCase()}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="chamfer-sm" style={{ width: 36, height: 36, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#5d3f3c' }}>
                          {opp.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ ...S.serif, fontSize: 13, color: '#e5e2e1', margin: '0 0 4px' }}>{opp.displayName}</p>
                          <Pips count={alive} dead={opp.isEliminated} />
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, ...S.mono, color: '#5d3f3c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>LIQUIDITY</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f6be3b', letterSpacing: '0.1em' }}>{opp.coins} GOLD</span>
                  </div>
                  {active && <div style={{ marginTop: 5, fontSize: 8, color: '#f6be3b', ...S.mono, letterSpacing: '0.2em' }}>▶ ACTIVE OPERATIVE</div>}
                  {opp.isEliminated && <div style={{ marginTop: 4, fontSize: 8, color: '#93000a', ...S.mono, letterSpacing: '0.2em' }}>■ ELIMINATED</div>}
                </div>
              )
            })}
          </div>

          {/* battlefield */}
          {showReact ? (
            <div className="fade-in" style={{ background: 'rgba(200,8,21,.04)', borderTop: '1px solid rgba(200,8,21,.3)', borderBottom: '1px solid rgba(200,8,21,.3)', padding: '22px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04, fontSize: 160, color: '#c80815', pointerEvents: 'none', userSelect: 'none' }}>◈</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-block', borderTop: '1px solid rgba(200,8,21,.35)', borderBottom: '1px solid rgba(200,8,21,.35)', padding: '10px 24px', marginBottom: 14 }}>
                  <h2 style={{ ...S.serif, fontSize: 20, color: '#e5e2e1', margin: 0 }}>{pendingLabel}</h2>
                  <p style={{ fontSize: 9, color: '#c80815', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '4px 0 0', ...S.mono }}>
                    {pending?.targetId ? `TARGET: ${nameMap[pending.targetId]?.toUpperCase() ?? '?'}` : 'PENDING COUNTER-MEASURES'}
                  </p>
                </div>
                {error && (
                  <div className="chamfer-sm" style={{ background: 'rgba(147,0,10,.2)', padding: '8px 16px', marginBottom: 12, fontSize: 10, color: '#ffb4ab', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{error}</span>
                    <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#c80815', cursor: 'pointer', marginLeft: 8 }}>✕</button>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {iCanChallenge && <button className="react-btn challenge" onClick={() => handleAction('challenge')} disabled={loading}>CHALLENGE</button>}
                  {iCanBlock && !blockCharPicker && (
                    <button className="react-btn block" onClick={() => blockOpts.length === 1 ? handleAction('block', undefined, blockOpts[0]) : setBlockCharPicker(true)} disabled={loading}>BLOCK</button>
                  )}
                  {blockCharPicker && blockOpts.map(ch => (
                    <button key={ch} className="react-btn block" onClick={() => { handleAction('block', undefined, ch); setBlockCharPicker(false) }} disabled={loading}>
                      BLOCK AS {ch.toUpperCase()}
                    </button>
                  ))}
                  <button className="react-btn pass" onClick={() => handleAction('pass')} disabled={loading}>PASS</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '14px 0', position: 'relative' }}>
              {isMyTurn && gameState.phase === 'player_turn' ? (
                <div className="fade-in" style={{ display: 'inline-block', borderTop: '1px solid rgba(246,190,59,.3)', borderBottom: '1px solid rgba(246,190,59,.3)', padding: '8px 24px' }}>
                  <p style={{ ...S.serif, fontSize: 17, color: '#f6be3b', margin: 0 }}>Your Move</p>
                  <p style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.2em', margin: '2px 0 0', ...S.mono }}>SELECT AN OPERATION BELOW</p>
                </div>
              ) : (
                <div style={{ display: 'inline-block', borderTop: '1px solid #2a2a2a', borderBottom: '1px solid #2a2a2a', padding: '8px 24px' }}>
                  <p style={{ ...S.serif, fontSize: 16, color: '#5d3f3c', margin: 0 }}>{nameMap[gameState.currentTurnUserId] ?? '…'}</p>
                  <p style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: '0.2em', margin: '2px 0 0', ...S.mono }}>AWAITING OPERATIVE</p>
                </div>
              )}
              {loading && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 48, height: 1, background: 'linear-gradient(90deg,transparent,#c80815,transparent)' }} />}
            </div>
          )}

          {/* my hand */}
          {myPlayer && (
            <div className="chamfer-md" style={{ background: '#1c1b1b', padding: 16, position: 'relative', overflow: 'hidden' }}>
              {isMyTurn && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#f6be3b 30%,#f6be3b 70%,transparent)' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {myPlayer.cards.map((card, i) => (
                    <div key={i} className="influence-card" style={{ width: 96, height: 144, border: card.revealed ? '1px solid #2a2a2a' : '1px solid rgba(200,8,21,.4)' }}>
                      <CardComponent card={card} size="md" alwaysShow />
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, ...S.mono, color: '#5d3f3c', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>YOUR LIQUIDITY</div>
                  <div style={{ fontWeight: 800, fontSize: 34, color: '#f6be3b', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {myPlayer.coins}<span style={{ fontSize: 13, marginLeft: 4, fontWeight: 600 }}>GOLD</span>
                  </div>
                  {myPlayer.isEliminated && <div style={{ fontSize: 9, color: '#93000a', letterSpacing: '0.2em', marginTop: 4, ...S.mono }}>■ ELIMINATED</div>}
                </div>
              </div>
            </div>
          )}

          {/* action grid */}
          {isMyTurn && gameState.phase === 'player_turn' && !myPlayer?.isEliminated && (
            <div className="fade-in">
              {error && (
                <div className="chamfer-sm" style={{ background: 'rgba(147,0,10,.15)', padding: '8px 12px', marginBottom: 8, fontSize: 10, color: '#ffb4ab', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{error}</span>
                  <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#c80815', cursor: 'pointer' }}>✕</button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
                <button className="action-btn" disabled={!validActs.includes('income') || loading} onClick={() => handleAction('income')}>INCOME</button>
                <button className="action-btn" disabled={!validActs.includes('foreign_aid') || loading} onClick={() => handleAction('foreign_aid')}>FOREIGN AID</button>
                <button className="action-btn" disabled={!validActs.includes('tax') || loading} onClick={() => handleAction('tax')}>TAX</button>
                <button className="action-btn" disabled={!validActs.includes('steal') || loading} onClick={() => setTargetAction('steal')}>STEAL</button>
                <button className="action-btn primary" style={{ gridColumn: 'span 2' }} disabled={!validActs.includes('assassinate') || loading} onClick={() => setTargetAction('assassinate')}>ASSASSINATE</button>
                <button className="action-btn" disabled={!validActs.includes('exchange') || loading} onClick={() => handleAction('exchange')}>EXCHANGE</button>
                <button className="action-btn danger" disabled={!validActs.includes('coup') || loading} onClick={() => setTargetAction('coup')}>COUP</button>
              </div>
            </div>
          )}

        </main>

        {/* bottom nav */}
        <nav style={S.nav}>
          <div style={S.navInner}>
            <button style={S.navBtn} onClick={() => navigate('/')}
              onMouseEnter={e => (e.currentTarget.style.color = '#c80815')}
              onMouseLeave={e => (e.currentTarget.style.color = '#353534')}>
              <span style={{ fontSize: 20 }}>⬡</span>
              <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>LOBBY</span>
            </button>
            <div className="chamfer-sm" style={S.navActive}>
              <span style={{ fontSize: 20 }}>◈</span>
              <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>INFLUENCE</span>
            </div>
            <button style={{ ...S.navBtn, color: showLog ? '#f6be3b' : '#353534' }} onClick={() => setShowLog(v => !v)}>
              <span style={{ fontSize: 20 }}>⊞</span>
              <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>INTEL</span>
            </button>
          </div>
        </nav>

        {/* target picker */}
        {targetAction && (
          <div style={S.overlay}>
            <div className="chamfer-md fade-in" style={{ background: '#1c1b1b', padding: 24, width: '100%', maxWidth: 340, borderLeft: '2px solid #c80815' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, ...S.mono, color: '#c80815', letterSpacing: '0.25em', marginBottom: 4 }}>OPERATION</div>
                <h3 style={{ ...S.serif, fontSize: 22, margin: 0, color: '#e5e2e1' }}>{ACTION_LABELS[targetAction]}</h3>
                <p style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.1em', margin: '4px 0 0', ...S.mono }}>SELECT TARGET OPERATIVE</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {gameState.players.filter(p => p.userId !== myId && !p.isEliminated).map(p => (
                  <button key={p.userId} className="target-row" onClick={() => { setTargetAction(null); handleAction(targetAction, p.userId) }}>
                    <div className="chamfer-sm" style={{ width: 30, height: 30, background: '#353534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#ad8883', flexShrink: 0 }}>
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...S.serif, fontSize: 14 }}>{p.displayName}</div>
                      <div style={{ fontSize: 9, color: '#5d3f3c', ...S.mono, letterSpacing: '0.1em' }}>{p.cards.filter(c => !c.revealed).length} INFLUENCE · {p.coins} GOLD</div>
                    </div>
                    <span style={{ color: '#c80815', fontSize: 14 }}>→</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setTargetAction(null)} className="chamfer-sm" style={{ width: '100%', marginTop: 12, background: 'none', border: '1px solid #2a2a2a', color: '#5d3f3c', cursor: 'pointer', padding: 10, fontSize: 10, letterSpacing: '0.15em', fontFamily: 'Space Grotesk,sans-serif', textTransform: 'uppercase' }}>
                ABORT
              </button>
            </div>
          </div>
        )}

        {/* lose influence */}
        {showLose && myPlayer && (
          <div style={S.overlay}>
            <div className="chamfer-md fade-in" style={{ background: '#1c1b1b', padding: 24, width: '100%', maxWidth: 360, borderLeft: '2px solid #93000a', textAlign: 'center' }}>
              <div style={{ fontSize: 9, ...S.mono, color: '#93000a', letterSpacing: '0.25em', marginBottom: 4 }}>DIRECTIVE</div>
              <h3 style={{ ...S.serif, fontSize: 22, color: '#ffb4ab', margin: '0 0 4px' }}>Surrender Influence</h3>
              <p style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.15em', margin: '0 0 20px', ...S.mono }}>SELECT IDENTITY TO REVEAL</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                {myPlayer.cards.map((card, i) => !card.revealed ? (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div className="influence-card selectable" style={{ width: 96, height: 144 }} onClick={() => handleLose(i)}>
                      <CardComponent card={card} size="md" alwaysShow selectable onClick={() => handleLose(i)} />
                    </div>
                    <span style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.1em', ...S.mono }}>{card.character.toUpperCase()}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          </div>
        )}

        {/* intel drawer */}
        {showLog && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex' }} onClick={() => setShowLog(false)}>
            <div style={{ flex: 1 }} />
            <div className="glass fade-in" style={{ width: 260, height: '100%', borderLeft: '1px solid rgba(93,63,60,.3)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(93,63,60,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 9, color: '#c80815', letterSpacing: '0.25em', ...S.mono }}>INTEL FEED</div>
                  <div style={{ fontSize: 11, color: '#ad8883', letterSpacing: '0.1em' }}>ACTION LOG</div>
                </div>
                <button onClick={() => setShowLog(false)} style={{ background: 'none', border: 'none', color: '#5d3f3c', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }} className="scroll-hide">
                <ActionLogComponent entries={actionLog} />
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}