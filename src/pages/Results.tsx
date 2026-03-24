import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { GameState } from '../lib/gameLogic'
import CardComponent from '../components/Card'

const CHARACTER_IMAGES: Record<string, string> = {
  Duke:        '/assets/characters/duke.png',
  Assassin:    '/assets/characters/assassin.png',
  Captain:     '/assets/characters/captain.png',
  Ambassador:  '/assets/characters/ambassador.png',
  Contessa:    '/assets/characters/contessa.png',
}

export default function Results() {
  const { code } = useParams<{ code: string }>()
  const navigate  = useNavigate()

  const [gameState,  setGameState]  = useState<GameState | null>(null)
  const [roomId,     setRoomId]     = useState<string | null>(null)
  const [gsRowId,    setGsRowId]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (!code) return
    const load = async () => {
      const { data: room } = await supabase.from('rooms').select().eq('code', code).single()
      if (!room) return
      setRoomId(room.id)

      const { data: gs } = await supabase
        .from('game_state').select().eq('room_id', room.id).single()
      if (!gs) return
      setGsRowId(gs.id)
      setGameState(gs.payload as GameState)
    }
    load()
  }, [code])

  const handlePlayAgain = async () => {
    if (!roomId || !gsRowId) return
    setLoading(true); setError('')
    try {
      await supabase.from('game_state').delete().eq('id', gsRowId)
      await supabase.from('rooms').update({ status: 'waiting' }).eq('id', roomId)
      navigate(`/room/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading results…</div>
      </div>
    )
  }

  const winner = gameState.players.find(p => p.userId === gameState.winnerId)
  const allPlayers = gameState.players

  /* Best card for the winner display (first revealed, or any) */
  const winnerCard =
    winner?.cards.find(c => c.revealed) ??
    winner?.cards[0] ?? null

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start p-6">

      {/* ── Winner banner ─────────────────────────────────────── */}
      <div className="relative w-full max-w-lg mb-8 mt-4">
        <div className="absolute inset-0 bg-amber-500/5 rounded-3xl blur-2xl" />
        <div className="relative bg-gray-900 border border-amber-900/60 rounded-3xl p-8 text-center shadow-2xl">
          <div className="text-6xl mb-3">👑</div>
          <div className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-1">Winner</div>
          <h1 className="text-4xl font-black text-white mb-4">
            {winner?.displayName ?? 'Unknown'}
          </h1>
          {winnerCard && (
            <div className="flex justify-center gap-4 items-end mb-4">
              <div className="text-center">
                <div className="relative inline-block">
                  {CHARACTER_IMAGES[winnerCard.character] && (
                    <div className="w-32 h-48 rounded-2xl overflow-hidden border-2 border-amber-500 shadow-lg shadow-amber-900/40 relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-800 to-amber-950" />
                      <img
                        src={CHARACTER_IMAGES[winnerCard.character]}
                        alt={winnerCard.character}
                        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 inset-x-0 text-center text-xs font-bold py-2 text-white">
                        {winnerCard.character}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <p className="text-gray-500 text-sm">The last noble standing</p>
        </div>
      </div>

      {/* ── Final standings ───────────────────────────────────── */}
      <div className="w-full max-w-lg mb-6">
        <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">Final Standings</h2>
        <div className="space-y-3">
          {allPlayers.map((player, rank) => {
            const isWinner = player.userId === gameState.winnerId
            return (
              <div
                key={player.userId}
                className={[
                  'bg-gray-900 rounded-2xl p-4 border flex items-center gap-4',
                  isWinner ? 'border-amber-600' : 'border-gray-800',
                ].join(' ')}
              >
                <div className="text-gray-600 text-sm w-5 text-right flex-shrink-0">
                  {isWinner ? '👑' : `#${rank + 1}`}
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isWinner ? 'bg-amber-700' : 'bg-gray-700'}`}>
                  {player.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{player.displayName}</div>
                  <div className="text-xs text-gray-500">{player.coins}💰 remaining</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {player.cards.map((card, i) => (
                    <CardComponent
                      key={i}
                      card={{ ...card, revealed: true }}
                      size="sm"
                      eliminated={player.isEliminated && !isWinner}
                    />
                  ))}
                </div>
                {player.isEliminated && !isWinner && (
                  <span className="text-red-400 text-xs flex-shrink-0">Eliminated</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={handlePlayAgain}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-xl px-6 py-3 transition-colors"
        >
          {loading ? 'Resetting…' : '🔄 Play Again'}
        </button>
        <button
          onClick={() => navigate('/')}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold rounded-xl px-6 py-3 transition-colors"
        >
          Leave
        </button>
      </div>
    </main>
  )
}
