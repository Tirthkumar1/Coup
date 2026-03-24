import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

function generateCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

export default function Lobby() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('coup_display_name') || ''
  )
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSendMagicLink = async () => {
    if (!email) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) setError(error.message)
    else setMagicSent(true)
    setLoading(false)
  }

  const handleCreateRoom = async () => {
    if (!displayName.trim()) { setError('Enter a display name'); return }
    setLoading(true); setError('')
    try {
      localStorage.setItem('coup_display_name', displayName.trim())
      const code = generateCode()
      const { data: room, error: re } = await supabase
        .from('rooms')
        .insert({ code, host_id: user!.id, status: 'waiting' })
        .select().single()
      if (re) throw re
      const { error: pe } = await supabase
        .from('players')
        .insert({ room_id: room.id, user_id: user!.id, display_name: displayName.trim() })
      if (pe) throw pe
      navigate(`/room/${code}`)
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  /* ── Join Room Logic (Shared) ── */
  const handleJoinRoom = async () => {
    if (!displayName.trim()) { setError('Enter a display name'); return }
    if (!joinCode.trim()) { setError('Enter a room code'); return }
    setLoading(true); setError('')
    try {
      localStorage.setItem('coup_display_name', displayName.trim())
      
      // Determine effective user ID (auth id or guest id)
      let effectiveId = user?.id
      if (!effectiveId) {
        effectiveId = localStorage.getItem('coup_guest_id')
        if (!effectiveId) {
          effectiveId = `guest_${Math.random().toString(36).substring(2, 9)}`
          localStorage.setItem('coup_guest_id', effectiveId)
        }
      }

      const { data: room, error: re } = await supabase
        .from('rooms').select().eq('code', joinCode.toUpperCase()).single()
      if (re || !room) throw new Error('Room not found')
      if (room.status !== 'waiting') throw new Error('Game already started')
      
      const { error: pe } = await supabase
        .from('players')
        .insert({ room_id: room.id, user_id: effectiveId, display_name: displayName.trim() })
      if (pe) throw pe
      
      navigate(`/room/${joinCode.toUpperCase()}`)
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  /* ── Layout ── */
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800">
        <div className="mb-6 text-center">
          <h1 className="text-5xl font-black text-white tracking-tight mb-1">COUP</h1>
          <p className="text-gray-500 text-xs">
            {user ? user.email : 'Playing as Guest'}
          </p>
        </div>

        {/* Display name */}
        <label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Display Name</label>
        <input
          type="text"
          placeholder="e.g. The Duke"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 mb-5 focus:outline-none focus:border-amber-500 transition-colors"
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Action: Join (Always Available) */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="CODE"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 uppercase tracking-[0.3em] font-mono text-center focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            onClick={handleJoinRoom}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-xl px-6 py-3 transition-colors"
          >
            Join
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs uppercase tracking-widest">Host a Game</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Action: Create (Requires Auth) */}
        {user ? (
          <>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-indigo-900 hover:bg-indigo-800 border border-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl px-4 py-3 transition-colors mb-4"
            >
              {loading ? 'Creating…' : '+ Create Room'}
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full text-gray-600 hover:text-gray-400 text-xs mt-2 transition-colors text-center"
            >
              Sign out
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500 text-xs text-center">Sign in with a magic link to host your own games.</p>
            {magicSent ? (
              <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-4 text-emerald-300 text-sm text-center">
                ✓ Check your email!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={handleSendMagicLink}
                  disabled={loading || !email}
                  className="w-full bg-indigo-900 hover:bg-indigo-800 border border-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl px-4 py-3 transition-colors"
                >
                  {loading ? 'Sending…' : 'Sign in to Host'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
