import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { initGame } from '../lib/gameLogic'
import type { User } from '@supabase/supabase-js'
import { styles, WAITING_ROOM_CSS } from '../components/waitingroom/WaitingRoomStyles'
import WaitingRoomHeader from '../components/waitingroom/WaitingRoomHeader'
import PlayerRoster from '../components/waitingroom/PlayerRoster'
import HostControls from '../components/waitingroom/HostControls'
import NonHostWaiting from '../components/waitingroom/NonHostWaiting'

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

  return (
    <div
      style={{ background: styles.surface, minHeight: '100dvh', fontFamily: "'Space Grotesk', sans-serif" }}
      className="flex flex-col overflow-hidden"
    >
      <style>{WAITING_ROOM_CSS}</style>

      <WaitingRoomHeader code={code} copied={copied} onCopy={copyCode} />

      <main className="flex-1 flex flex-col px-4 pt-5 pb-24 overflow-y-auto">
        <PlayerRoster players={players} hostId={room?.host_id} playerCount={players.length} />

        {error && (
          <div style={{ background: '#93000a22', border: `1px solid #93000a`, padding: '10px 14px', marginBottom: 16 }}>
            <span style={{ color: styles.primary, fontSize: 11, fontFamily: 'Inter' }}>{error}</span>
          </div>
        )}

        {isHost ? (
          <HostControls
            code={code}
            playerCount={players.length}
            canStart={canStart}
            loading={loading}
            onAddBot={handleAddBot}
            onStartGame={handleStartGame}
          />
        ) : (
          <NonHostWaiting />
        )}

        <button onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: styles.outlineVariant, fontSize: 10, fontFamily: 'Inter', letterSpacing: '0.15em', padding: '16px', cursor: 'pointer', textTransform: 'uppercase', marginTop: 12 }}>
          ← Abandon Operation
        </button>
      </main>

      <nav style={{ background: 'rgba(14,14,14,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${styles.outlineVariant}26`, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <div className="flex justify-around items-center h-16 px-2">
          <div style={{ background: styles.containerHigh, clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)', padding: '6px 16px' }} className="flex flex-col items-center gap-1">
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 22, color: styles.secondary }}>groups</span>
            <span style={{ fontSize: 8, fontFamily: 'Inter', letterSpacing: '0.15em', color: styles.secondary, fontWeight: 700 }} className="uppercase">LOBBY</span>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => navigate(`/game/${code}`)}>
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 22, color: styles.outlineVariant }}>security</span>
            <span style={{ fontSize: 8, fontFamily: 'Inter', letterSpacing: '0.15em', color: styles.outlineVariant }} className="uppercase">INFLUENCE</span>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer" style={{ opacity: 0.4 }}>
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 22, color: styles.onSurfaceVar }}>database</span>
            <span style={{ fontSize: 8, fontFamily: 'Inter', letterSpacing: '0.15em', color: styles.onSurfaceVar }} className="uppercase">INTEL</span>
          </div>
        </div>
      </nav>
    </div>
  )
}
