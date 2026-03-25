import type { GameState } from '../../lib/gameLogic'
import CardComponent from '../Card'
import { S } from './GameStyles'

interface PlayerHandProps {
  gameState: GameState
  myId: string
}

export default function PlayerHand({ gameState, myId }: PlayerHandProps) {
  const myPlayer = gameState.players.find(p => p.userId === myId)
  const isMyTurn = gameState.currentTurnUserId === myId

  if (!myPlayer) return null

  return (
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
  )
}
