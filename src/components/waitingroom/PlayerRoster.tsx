import { styles, chamferSm } from './WaitingRoomStyles'

interface DbPlayer {
  id: string
  user_id: string
  display_name: string
  joined_at: string
}

interface PlayerRosterProps {
  players: DbPlayer[]
  hostId: string | undefined
  playerCount: number
}

const botAvatarLetters = ['α', 'β', 'γ', 'δ', 'ε', 'ζ']

export default function PlayerRoster({ players, hostId, playerCount }: PlayerRosterProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Hero title block */}
      <div className="mb-8 relative" style={{ marginBottom: 24 }}>
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
        <div className="flex items-center gap-3 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              ...chamferSm,
              width: 28, height: 8,
              background: i < playerCount ? styles.primaryContainer : styles.containerHigh,
              boxShadow: i < playerCount ? '0 0 8px rgba(200,8,21,0.4)' : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
          <span style={{ color: styles.onSurfaceVar, fontSize: 10, fontFamily: 'Inter', marginLeft: 4 }}>
            {playerCount}/6 OPERATIVES
          </span>
        </div>
      </div>

      {/* Roster label */}
      <div className="flex justify-between items-center mb-3">
        <span style={{ color: styles.onSurfaceVar, fontSize: 9, letterSpacing: '0.2em', fontFamily: 'Inter' }} className="uppercase">
          Operative Roster
        </span>
        <div style={{ height: 1, flex: 1, background: `${styles.outlineVariant}40`, marginLeft: 12 }} />
      </div>

      {/* Player list */}
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
          const isThisHost = hostId && p.user_id === hostId
          return (
            <div key={p.id} className="player-row player-item flex items-center gap-3 transition-all"
              style={{ background: styles.containerLow, padding: '10px 14px', ...chamferSm, borderLeft: isThisHost ? `2px solid ${styles.primaryContainer}` : isBot ? `2px solid ${styles.outlineVariant}` : `2px solid ${styles.containerHigh}` }}>
              <div style={{ ...chamferSm, width: 32, height: 32, background: isBot ? styles.containerHighest : styles.primaryContainer + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${isBot ? styles.outlineVariant : styles.primaryContainer}40` }}>
                <span style={{ fontFamily: isBot ? 'Inter' : 'Newsreader, serif', fontStyle: isBot ? 'normal' : 'italic', fontSize: isBot ? 12 : 14, color: isBot ? styles.onSurfaceVar : styles.primary, fontWeight: 600 }}>
                  {isBot ? botAvatarLetters[i % 6] : p.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
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
  )
}
