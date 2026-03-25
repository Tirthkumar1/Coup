import type { GameState } from '../../lib/gameLogic'
import { S } from './GameStyles'

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

interface OpponentsGridProps {
  gameState: GameState
  myId: string
}

export default function OpponentsGrid({ gameState, myId }: OpponentsGridProps) {
  const opponents = gameState.players.filter(p => p.userId !== myId)

  return (
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
  )
}
