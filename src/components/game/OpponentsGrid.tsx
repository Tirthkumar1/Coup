import type { GameState } from '../../lib/gameLogic'

interface OpponentsGridProps {
  gameState: GameState
  myId: string
}

export default function OpponentsGrid({ gameState, myId }: OpponentsGridProps) {
  const opponents = gameState.players.filter(p => p.userId !== myId)
  const N = opponents.length
  const RADIUS = 122
  const CX = 160
  const CY = 148

  return (
    <div style={{ position: 'relative', width: 320, height: 300, flexShrink: 0 }}>
      {/* Subtle orbit ring */}
      <div style={{
        position: 'absolute',
        left: CX - RADIUS, top: CY - RADIUS,
        width: RADIUS * 2, height: RADIUS * 2,
        borderRadius: '50%',
        border: '1px solid rgba(93,63,60,0.25)',
        pointerEvents: 'none',
      }} />

      {/* Central Treasury */}
      <div style={{
        position: 'absolute',
        left: CX, top: CY,
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(10,10,10,0.85)',
        padding: '10px 14px',
        borderRadius: '50%',
        border: '1px solid rgba(246,190,59,0.2)',
        backdropFilter: 'blur(4px)',
        zIndex: 10,
        minWidth: 84, minHeight: 84,
        justifyContent: 'center',
        boxShadow: '0 0 24px rgba(0,0,0,0.6)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#f6be3b', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
        <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', color: '#f6be3b', fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>{gameState.treasuryCoins}</span>
        <span style={{ fontSize: 7, color: '#5d3f3c', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Inter,monospace' }}>Treasury</span>
      </div>

      {/* Player avatars around the circle */}
      {opponents.map((opp, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / (N || 1)
        const x = CX + RADIUS * Math.cos(angle)
        const y = CY + RADIUS * Math.sin(angle)
        const isActive = gameState.currentTurnUserId === opp.userId
        const alive = opp.cards.filter(c => !c.revealed).length

        return (
          <div key={opp.userId} style={{
            position: 'absolute',
            left: x, top: y,
            transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            zIndex: 2,
          }}>
            {/* Avatar circle */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: `2px solid ${isActive ? '#f6be3b' : opp.isEliminated ? '#2a2a2a' : '#5d3f3c'}`,
              background: '#201f1f',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 700,
              color: opp.isEliminated ? '#353534' : '#e5e2e1',
              filter: opp.isEliminated ? 'grayscale(1)' : 'none',
              boxShadow: isActive ? '0 0 14px rgba(246,190,59,0.5)' : 'none',
              transition: 'all 0.3s',
              fontFamily: 'Space Grotesk,sans-serif',
              flexShrink: 0,
            }}>
              {opp.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Influence pips */}
            <div style={{ marginTop: 4, display: 'flex', gap: 3 }}>
              {[0, 1].map(j => (
                <div key={j} style={{
                  width: 9, height: 13,
                  borderRadius: 2,
                  background: opp.isEliminated ? '#93000a' : j < alive ? '#c80815' : '#2a2a2a',
                  border: `1px solid ${j < alive && !opp.isEliminated ? '#5d3f3c' : '#1c1b1b'}`,
                }} />
              ))}
            </div>

            {/* Name */}
            <div style={{
              fontSize: 8, marginTop: 2,
              color: isActive ? '#f6be3b' : '#5d3f3c',
              fontFamily: 'Space Grotesk,sans-serif',
              letterSpacing: '0.04em',
              fontWeight: isActive ? 700 : 400,
              maxWidth: 62,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>
              {opp.displayName}
            </div>

            {/* Coin count */}
            <div style={{
              fontSize: 8, color: '#f6be3b',
              fontFamily: 'Inter,monospace',
              letterSpacing: '0.08em',
              opacity: 0.8,
            }}>
              {opp.coins}g
            </div>
          </div>
        )
      })}
    </div>
  )
}
