import type { GameState, ActionType } from '../../lib/gameLogic'

const CHARACTER_IMAGES: Record<string, string> = {
  Duke: '/charactors/Duke.png',
  Assassin: '/charactors/Assassin.png',
  Captain: '/charactors/captain.png',
  Ambassador: '/charactors/Ambassador.png',
  Contessa: '/charactors/Contessa.png',
}

const CHARACTER_GRADIENTS: Record<string, string> = {
  Duke: 'linear-gradient(to bottom, #854d0e, #422006)',
  Assassin: 'linear-gradient(to bottom, #475569, #0f172a)',
  Captain: 'linear-gradient(to bottom, #1d4ed8, #1e3a8a)',
  Ambassador: 'linear-gradient(to bottom, #15803d, #14532d)',
  Contessa: 'linear-gradient(to bottom, #be123c, #881337)',
}

const CHAR_ABILITIES: Record<string, string> = {
  Duke: 'Tax · Block Aid',
  Assassin: 'Assassinate',
  Captain: 'Steal · Block Steal',
  Ambassador: 'Exchange · Block Steal',
  Contessa: 'Block Assassin',
}

const ACTION_BUTTONS: Array<{ icon: string; label: string; action: ActionType; needsTarget: boolean }> = [
  { icon: 'swap_horiz', label: 'Exch', action: 'exchange', needsTarget: false },
  { icon: 'skull', label: 'Kill', action: 'assassinate', needsTarget: true },
  { icon: 'visibility', label: 'Steal', action: 'steal', needsTarget: true },
  { icon: 'toll', label: 'Tax', action: 'tax', needsTarget: false },
  { icon: 'public', label: 'Aid', action: 'foreign_aid', needsTarget: false },
  { icon: 'payments', label: 'Inc', action: 'income', needsTarget: false },
]

interface PlayerHandProps {
  gameState: GameState
  myId: string
  validActions: ActionType[]
  loading: boolean
  error: string
  onClearError: () => void
  onAction: (action: ActionType) => void
  onTargetAction: (action: ActionType) => void
}

export default function PlayerHand({
  gameState, myId, validActions, loading, error, onClearError, onAction, onTargetAction,
}: PlayerHandProps) {
  const myPlayer = gameState.players.find(p => p.userId === myId)
  const isMyTurn = gameState.currentTurnUserId === myId

  if (!myPlayer) return null

  const canDo = (action: ActionType) => isMyTurn && validActions.includes(action) && !loading && !myPlayer.isEliminated

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 10, padding: '4px 16px 10px', flexShrink: 0,
    }}>
      {/* Turn indicator */}
      {isMyTurn && !myPlayer.isEliminated && (
        <div className="fade-in" style={{
          background: 'rgba(200,8,21,0.2)',
          border: '1px solid rgba(200,8,21,0.3)',
          borderRadius: 999, padding: '3px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#c80815', animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#ffb4a8',
            fontFamily: 'Space Grotesk,sans-serif',
          }}>Your Turn</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(147,0,10,.15)', padding: '6px 12px',
          borderRadius: 4, fontSize: 10, color: '#ffb4ab',
          letterSpacing: '0.1em', width: '100%', maxWidth: 340,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={onClearError} style={{ background: 'none', border: 'none', color: '#c80815', cursor: 'pointer', marginLeft: 8 }}>✕</button>
        </div>
      )}

      {/* Cards + COUP button row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Player cards */}
        <div style={{ display: 'flex', gap: 10 }}>
          {myPlayer.cards.map((card, i) => (
            <div key={i} style={{
              width: 104, height: 148,
              background: CHARACTER_GRADIENTS[card.character] ?? 'linear-gradient(to bottom,#2a2a2a,#131313)',
              borderRadius: 10,
              border: `2px solid ${card.revealed ? '#353534' : '#f6be3b'}`,
              boxShadow: card.revealed ? 'none' : '0 4px 16px rgba(0,0,0,0.6)',
              transform: `rotate(${i === 0 ? '-3deg' : '3deg'})`,
              overflow: 'hidden', position: 'relative',
              display: 'flex', flexDirection: 'column',
              transition: 'transform 0.2s',
            }}>
              {/* Character image */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <img
                  src={CHARACTER_IMAGES[card.character]}
                  alt={card.character}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.85 }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 55%)' }} />
              </div>
              {/* Name + abilities */}
              <div style={{ padding: '5px 6px', background: 'rgba(0,0,0,0.45)', textAlign: 'center' }}>
                <p style={{
                  fontFamily: 'Newsreader,serif', fontStyle: 'italic',
                  color: '#f6be3b', fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.2,
                }}>{card.character}</p>
                <p style={{
                  fontSize: 7, color: '#ad8883', letterSpacing: '0.1em',
                  textTransform: 'uppercase', margin: '2px 0 0',
                  fontFamily: 'Inter,monospace',
                }}>{CHAR_ABILITIES[card.character] ?? ''}</p>
              </div>
              {/* Revealed X overlay */}
              {card.revealed && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 40 40" style={{ width: '50%', height: '50%' }}>
                    <line x1="4" y1="4" x2="36" y2="36" stroke="#c80815" strokeWidth="5" strokeLinecap="round" />
                    <line x1="36" y1="4" x2="4" y2="36" stroke="#c80815" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* COUP button + coins */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button
            disabled={!canDo('coup')}
            onClick={() => onTargetAction('coup')}
            style={{
              width: 82, height: 82, borderRadius: '50%',
              background: canDo('coup')
                ? 'linear-gradient(180deg, #ffb4a8, #8b0000)'
                : '#1c1b1b',
              border: `3px solid ${canDo('coup') ? 'rgba(246,190,59,0.35)' : '#2a2a2a'}`,
              boxShadow: canDo('coup') ? '0 8px 28px rgba(139,0,0,0.65)' : 'none',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: canDo('coup') ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              padding: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 28,
                color: canDo('coup') ? '#ffd7d2' : '#353534',
                fontVariationSettings: "'FILL' 1",
              }}
            >gavel</span>
            <span style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '-0.01em',
              textTransform: 'uppercase', marginTop: -2,
              color: canDo('coup') ? '#ffd7d2' : '#353534',
              fontFamily: 'Newsreader,serif', fontStyle: 'italic',
            }}>COUP</span>
          </button>
          {/* Coins */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f6be3b', lineHeight: 1, fontFamily: 'Space Grotesk,sans-serif' }}>{myPlayer.coins}</div>
            <div style={{ fontSize: 7, color: '#5d3f3c', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Inter,monospace' }}>GOLD</div>
          </div>
          {myPlayer.isEliminated && (
            <div style={{ fontSize: 8, color: '#93000a', letterSpacing: '0.15em', fontFamily: 'Inter,monospace' }}>■ OUT</div>
          )}
        </div>
      </div>

      {/* Action bar pill */}
      <div style={{
        width: '100%', maxWidth: 364,
        background: 'rgba(32,31,31,0.75)',
        backdropFilter: 'blur(14px)',
        borderRadius: 999,
        padding: '6px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        border: '1px solid rgba(90,64,60,0.2)',
      }}>
        {ACTION_BUTTONS.map(({ icon, label, action, needsTarget }) => (
          <button
            key={action}
            disabled={!canDo(action)}
            onClick={() => needsTarget ? onTargetAction(action) : onAction(action)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, borderRadius: '50%',
              background: 'none', border: 'none',
              cursor: canDo(action) ? 'pointer' : 'not-allowed',
              opacity: canDo(action) ? 1 : 0.32,
              transition: 'background 0.15s, opacity 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#f6be3b' }}>{icon}</span>
            <span style={{
              fontSize: 7, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontFamily: 'Space Grotesk,sans-serif',
              color: '#5d3f3c', marginTop: 1,
            }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
