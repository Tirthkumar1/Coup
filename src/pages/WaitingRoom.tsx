import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { initGame } from '../lib/gameLogic'
import type { User } from '@supabase/supabase-js'

interface DbPlayer {
  id: string
  user_id: string
  display_name: string
  joined_at: string
}

interface Room {
  id: string
  code: string
  status: string
  host_id: string
}

/* ── Noir Design Tokens (mirroring code.html tailwind config) ─── */
const styles = {
  surface: '#131313',
  containerLow: '#1c1b1b',
  containerHigh: '#2a2a2a',
  containerHighest: '#353534',
  containerLowest: '#0e0e0e',
  primary: '#ffb4ab',
  primaryContainer: '#c80815',
  secondary: '#f6be3b',
  outlineVariant: '#5d3f3c',
  onSurface: '#e5e2e1',
  onSurfaceVar: '#e6bdb8',
}

/* ── Inline style helpers ─────────────────────────────────────── */
const chamferSm = { clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }
const chamferMd = { clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }
const chamferBtn = { clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }

export default function WaitingRoom() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<DbPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])


  useEffect(() => {
    if (!code) return
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: rm } = await supabase.from('rooms').select().eq('code', code).single()
      if (!rm) return
      setRoom(rm)

      const { data: pl } = await supabase.from('players').select().eq('room_id', rm.id).order('joined_at')
      setPlayers(pl ?? [])

      channel = supabase.channel(`waiting-${rm.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${rm.id}` }, async () => {
          const { data } = await supabase.from('players').select().eq('room_id', rm.id).order('joined_at')
          setPlayers(data ?? [])
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${rm.id}` }, ({ new: updated }) => {
          if ((updated as Room).status === 'active') navigate(`/game/${code}`)
        })
        .subscribe()
    }

    init()
    return () => { channel && supabase.removeChannel(channel) }
  }, [code, navigate])

  const isHost = user && room && user.id === room.host_id
  const canStart = players.length >= 2 && players.length <= 6

  const handleStartGame = async () => {
    if (!room || !isHost) return
    setLoading(true); setError('')
    try {
      const playerInfos = players.map(p => ({ userId: p.user_id, displayName: p.display_name }))
      const gs = initGame(playerInfos)

      const { error: gsErr } = await supabase.from('game_state').insert({
        room_id: room.id,
        phase: gs.phase,
        current_turn_user_id: gs.currentTurnUserId,
        treasury_coins: gs.treasuryCoins,
        deck: gs.deck,
        payload: gs,
      })
      if (gsErr) throw gsErr

      const { error: rmErr } = await supabase.from('rooms').update({ status: 'active' }).eq('id', room.id)
      if (rmErr) throw rmErr

      navigate(`/game/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  const handleAddBot = async () => {
    if (!room || !isHost) return
    setLoading(true); setError('')
    try {
      const botNumber = players.filter(p => p.user_id.startsWith('bot_')).length + 1
      const botId = `bot_${Math.random().toString(36).substring(2, 9)}`
      const { error: pe } = await supabase.from('players').insert({
        room_id: room.id,
        user_id: botId,
        display_name: `UNIT_0${botNumber}`,
      })
      if (pe) throw pe
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Bot names for flavor
  const botAvatarLetters = ['α', 'β', 'γ', 'δ', 'ε', 'ζ']

  return (
    <div
      style={{ background: styles.surface, minHeight: '100dvh', fontFamily: "'Space Grotesk', sans-serif" }}
      className="flex flex-col overflow-hidden"
    >
      {/* Google Fonts injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400;1,600&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;700&display=swap');
        .chamfer-sm { clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px); }
        .chamfer-md { clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); }
        .chamfer-btn { clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)); }
        .scanline { animation: scan 4s linear infinite; }
        @keyframes scan {
          0%   { opacity: 0.03; }
          50%  { opacity: 0.06; }
          100% { opacity: 0.03; }
        }
        .blink { animation: blink 1.2s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .player-row { animation: slideIn 0.3s ease-out; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .glow-gold { box-shadow: 0 0 20px rgba(246,190,59,0.25); }
        .glow-red  { box-shadow: 0 0 20px rgba(200,8,21,0.3); }
        .btn-primary:hover { background: #e00a18 !important; box-shadow: 0 0 20px rgba(200,8,21,0.4); }
        .btn-secondary:hover { box-shadow: 0 0 20px rgba(246,190,59,0.3); color: ${styles.secondary} !important; }
        .player-item:hover { background: ${styles.containerHigh} !important; }
      `}</style>

      {/* ── Top AppBar ─────────────────────────────────────────── */}
      <header style={{ background: 'rgba(14,14,14,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${styles.outlineVariant}26` }}
        className="flex justify-between items-center px-5 py-3 sticky top-0 z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div style={{ color: styles.primaryContainer, fontSize: 18, fontFamily: 'Material Symbols Outlined' }}>terminal</div>
          <div>
            <div style={{ color: styles.primaryContainer, fontSize: 9, letterSpacing: '0.2em', fontWeight: 700 }} className="uppercase font-mono">
              OPERATION NOIR
            </div>
            <div style={{ color: styles.onSurface, fontSize: 11, letterSpacing: '0.15em', fontWeight: 700 }} className="uppercase">
              STAGING AREA
            </div>
          </div>
        </div>

        {/* Room Code badge */}
        <button onClick={copyCode} style={{ ...chamferSm, background: styles.containerLowest, border: `1px solid ${styles.outlineVariant}`, padding: '4px 14px', cursor: 'pointer' }}
          className="flex items-center gap-2 transition-all">
          <span style={{ color: styles.onSurfaceVar, fontSize: 9, fontFamily: 'Inter', letterSpacing: '0.1em' }} className="uppercase">Session</span>
          <span style={{ color: styles.secondary, fontFamily: 'Inter', fontSize: 13, letterSpacing: '0.25em', fontWeight: 700 }}>
            {code}
          </span>
          <span style={{ color: copied ? styles.secondary : styles.outlineVariant, fontSize: 9, fontFamily: 'Inter' }}>
            {copied ? '✓ COPIED' : 'COPY'}
          </span>
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-4 pt-5 pb-24 overflow-y-auto">

        {/* Hero title block */}
        <div className="mb-8 relative">
          {/* Decorative scanline */}
          <div className="scanline absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)' }} />

          <div style={{ borderLeft: `3px solid ${styles.primaryContainer}`, paddingLeft: 16, marginBottom: 4 }}>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: 28, fontStyle: 'italic', color: styles.onSurface, lineHeight: 1.1 }}>
              Awaiting Operatives
            </div>
            <div style={{ color: styles.primaryContainer, fontSize: 9, letterSpacing: '0.25em', fontFamily: 'Inter', marginTop: 4 }} className="uppercase">
              LOBBY_STANDBY // OPERATION NOIR
            </div>
          </div>

          {/* Player count indicator */}
          <div className="flex items-center gap-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                ...chamferSm,
                width: 28, height: 8,
                background: i < players.length ? styles.primaryContainer : styles.containerHigh,
                boxShadow: i < players.length ? '0 0 8px rgba(200,8,21,0.4)' : 'none',
                transition: 'all 0.3s',
              }} />
            ))}
            <span style={{ color: styles.onSurfaceVar, fontSize: 10, fontFamily: 'Inter', marginLeft: 4 }}>
              {players.length}/6 OPERATIVES
            </span>
          </div>
        </div>

        {/* ── Player roster ──────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div className="flex justify-between items-center mb-3">
            <span style={{ color: styles.onSurfaceVar, fontSize: 9, letterSpacing: '0.2em', fontFamily: 'Inter' }} className="uppercase">
              Operative Roster
            </span>
            <div style={{ height: 1, flex: 1, background: `${styles.outlineVariant}40`, marginLeft: 12 }} />
          </div>

          <div className="flex flex-col gap-2">
            {players.length === 0 && (
              <div style={{ background: styles.containerLow, padding: '20px', textAlign: 'center', ...chamferSm }}>
                <span style={{ color: styles.onSurfaceVar, fontSize: 11, fontFamily: 'Inter' }} className="uppercase tracking-widest">
                  Awaiting connection<span className="blink">_</span>
                </span>
              </div>
            )}

            {players.map((p, i) => {
              const isBot = p.user_id.startsWith('bot_')
              const isThisHost = room && p.user_id === room.host_id
              return (
                <div key={p.id} className="player-row player-item flex items-center gap-3 transition-all"
                  style={{ background: styles.containerLow, padding: '10px 14px', ...chamferSm, borderLeft: isThisHost ? `2px solid ${styles.primaryContainer}` : isBot ? `2px solid ${styles.outlineVariant}` : `2px solid ${styles.containerHigh}` }}>

                  {/* Avatar */}
                  <div style={{ ...chamferSm, width: 32, height: 32, background: isBot ? styles.containerHighest : styles.primaryContainer + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${isBot ? styles.outlineVariant : styles.primaryContainer}40` }}>
                    <span style={{ fontFamily: isBot ? 'Inter' : 'Newsreader, serif', fontStyle: isBot ? 'normal' : 'italic', fontSize: isBot ? 12 : 14, color: isBot ? styles.onSurfaceVar : styles.primary, fontWeight: 600 }}>
                      {isBot ? botAvatarLetters[i % 6] : p.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: isBot ? 'Inter' : 'Space Grotesk', fontSize: isBot ? 10 : 12, fontWeight: 600, color: isBot ? styles.onSurfaceVar : styles.onSurface, letterSpacing: isBot ? '0.1em' : '0.05em', textTransform: isBot ? 'uppercase' : 'none' }} className="truncate">
                      {p.display_name}
                    </div>
                    {isBot && (
                      <div style={{ fontSize: 8, color: styles.outlineVariant, fontFamily: 'Inter', letterSpacing: '0.15em' }} className="uppercase">
                        AI OPERATIVE
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {isThisHost && (
                      <div style={{ ...chamferSm, background: styles.primaryContainer + '22', border: `1px solid ${styles.primaryContainer}60`, padding: '2px 8px' }}>
                        <span style={{ color: styles.primaryContainer, fontSize: 8, fontFamily: 'Inter', letterSpacing: '0.15em', fontWeight: 700 }} className="uppercase">HOST</span>
                      </div>
                    )}
                    <div style={{ ...chamferSm, background: styles.containerHighest, padding: '2px 6px' }}>
                      <span style={{ color: styles.onSurfaceVar, fontSize: 8, fontFamily: 'Inter' }}>#{i + 1}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div style={{ background: '#93000a22', border: `1px solid #93000a`, padding: '10px 14px', marginBottom: 16, ...chamferSm }}>
            <span style={{ color: styles.primary, fontSize: 11, fontFamily: 'Inter' }}>{error}</span>
          </div>
        )}

        {/* ── Controls (Host) ────────────────────────────────── */}
        {isHost ? (
          <div className="flex flex-col gap-3">

            {/* Add Bot */}
            <button onClick={handleAddBot} disabled={players.length >= 6 || loading}
              className="btn-secondary transition-all"
              style={{ ...chamferBtn, background: 'transparent', border: `1px solid ${styles.outlineVariant}`, color: styles.onSurfaceVar, padding: '14px', fontSize: 10, fontFamily: 'Inter', letterSpacing: '0.2em', fontWeight: 700, cursor: players.length >= 6 ? 'not-allowed' : 'pointer', opacity: players.length >= 6 ? 0.4 : 1 }}>
              + DEPLOY AI OPERATIVE
            </button>

            {/* Start Game */}
            <button onClick={handleStartGame} disabled={!canStart || loading}
              className="btn-primary transition-all"
              style={{ ...chamferBtn, background: canStart ? styles.primaryContainer : styles.containerHigh, color: canStart ? '#ffd7d2' : styles.onSurfaceVar, padding: '16px', fontSize: 11, fontFamily: 'Inter', letterSpacing: '0.25em', fontWeight: 700, cursor: !canStart ? 'not-allowed' : 'pointer', opacity: !canStart ? 0.5 : 1 }}>
              {loading ? (
                <span>INITIALIZING<span className="blink">_</span></span>
              ) : canStart ? (
                `▶  INITIATE OPERATION  //  ${players.length} OPERATIVES`
              ) : (
                `REQUIRES ${2 - players.length} MORE OPERATIVE${2 - players.length !== 1 ? 'S' : ''}`
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div style={{ flex: 1, height: 1, background: `${styles.outlineVariant}30` }} />
              <span style={{ color: styles.outlineVariant, fontSize: 9, fontFamily: 'Inter', letterSpacing: '0.15em' }} className="uppercase">Share access code</span>
              <div style={{ flex: 1, height: 1, background: `${styles.outlineVariant}30` }} />
            </div>

            {/* Share code display */}
            <div style={{ background: styles.containerLowest, border: `1px solid ${styles.outlineVariant}40`, padding: '16px', ...chamferMd, textAlign: 'center' }}>
              <div style={{ color: styles.onSurfaceVar, fontSize: 9, fontFamily: 'Inter', letterSpacing: '0.2em', marginBottom: 8 }} className="uppercase">
                Operative Access Code
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 36, fontWeight: 700, color: styles.secondary, letterSpacing: '0.5em' }}>
                {code}
              </div>
              <div style={{ color: styles.outlineVariant, fontSize: 9, fontFamily: 'Inter', marginTop: 6 }}>
                Share with other operatives to join this operation
              </div>
            </div>
          </div>
        ) : (
          /* Non-host waiting state */
          <div style={{ background: styles.containerLow, ...chamferMd, padding: '24px', textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, background: styles.containerHighest, ...chamferSm, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <span style={{ color: styles.secondary, fontSize: 20 }}>⟳</span>
              </div>
              <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 16, color: styles.onSurface, marginBottom: 6 }}>
                Standing By
              </div>
              <div style={{ color: styles.onSurfaceVar, fontSize: 10, fontFamily: 'Inter', letterSpacing: '0.15em' }} className="uppercase">
                Awaiting host to initiate operation<span className="blink">_</span>
              </div>
            </div>
            {/* Pulse dots */}
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, background: styles.primaryContainer, ...chamferSm, animation: `blink ${1 + i * 0.3}s step-end infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Leave */}
        <button onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: styles.outlineVariant, fontSize: 10, fontFamily: 'Inter', letterSpacing: '0.15em', padding: '16px', cursor: 'pointer', textTransform: 'uppercase', marginTop: 12 }}>
          ← Abandon Operation
        </button>
      </main>

      {/* ── Bottom Nav ─────────────────────────────────────────── */}
      <nav style={{ background: 'rgba(14,14,14,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${styles.outlineVariant}26`, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <div className="flex justify-around items-center h-16 px-2">
          {/* Lobby (active) */}
          <div style={{ background: styles.containerHigh, ...chamferSm, padding: '6px 16px' }} className="flex flex-col items-center gap-1">
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 22, color: styles.secondary }}>groups</span>
            <span style={{ fontSize: 8, fontFamily: 'Inter', letterSpacing: '0.15em', color: styles.secondary, fontWeight: 700 }} className="uppercase">LOBBY</span>
          </div>
          {/* Influence */}
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => navigate(`/game/${code}`)}>
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 22, color: styles.outlineVariant }}>security</span>
            <span style={{ fontSize: 8, fontFamily: 'Inter', letterSpacing: '0.15em', color: styles.outlineVariant }} className="uppercase">INFLUENCE</span>
          </div>
          {/* Intel */}
          <div className="flex flex-col items-center gap-1 cursor-pointer" style={{ opacity: 0.4 }}>
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 22, color: styles.onSurfaceVar }}>database</span>
            <span style={{ fontSize: 8, fontFamily: 'Inter', letterSpacing: '0.15em', color: styles.onSurfaceVar }} className="uppercase">INTEL</span>
          </div>
        </div>
      </nav>
    </div>
  )
}