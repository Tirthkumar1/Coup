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

export default function WaitingRoom() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<DbPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  /* Auth */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
  }, [])

  /* Room + players + realtime */
  useEffect(() => {
    if (!code) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: rm } = await supabase
        .from('rooms').select().eq('code', code).single()
      if (!rm) return
      setRoom(rm)

      const { data: pl } = await supabase
        .from('players').select().eq('room_id', rm.id).order('joined_at')
      setPlayers(pl ?? [])

      channel = supabase.channel(`waiting-${rm.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'players',
          filter: `room_id=eq.${rm.id}`,
        }, async () => {
          const { data } = await supabase
            .from('players').select().eq('room_id', rm.id).order('joined_at')
          setPlayers(data ?? [])
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'rooms',
          filter: `id=eq.${rm.id}`,
        }, ({ new: updated }) => {
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
      const playerInfos = players.map(p => ({
        userId: p.user_id,
        displayName: p.display_name,
      }))
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

      const { error: rmErr } = await supabase
        .from('rooms').update({ status: 'active' }).eq('id', room.id)
      if (rmErr) throw rmErr

      navigate(`/game/${code}`)
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
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">COUP</h1>
          <p className="text-gray-500 text-sm mb-3">Waiting for players…</p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-5 py-2 transition-colors"
          >
            <span className="text-white font-mono text-2xl tracking-[0.3em] font-bold">{code}</span>
            <span className="text-gray-500 text-xs">{copied ? '✓ Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Player list */}
        <div className="space-y-2 mb-6">
          {players.length === 0 && (
            <p className="text-gray-600 text-sm text-center italic">No players yet…</p>
          )}
          {players.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {p.display_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-semibold flex-1">{p.display_name}</span>
              {room && p.user_id === room.host_id && (
                <span className="text-amber-400 text-xs font-semibold">HOST</span>
              )}
              <span className="text-gray-600 text-xs">#{i + 1}</span>
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Controls */}
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={!canStart || loading}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-xl px-4 py-3 transition-colors"
          >
            {loading
              ? 'Starting…'
              : canStart
                ? `Start Game (${players.length} players)`
                : `Need at least 2 players (${players.length}/2)`}
          </button>
        ) : (
          <div className="text-center text-gray-500 text-sm py-2">
            Waiting for the host to start the game…
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full text-gray-600 hover:text-gray-400 text-xs mt-4 transition-colors"
        >
          Leave room
        </button>
      </div>
    </main>
  )
}
