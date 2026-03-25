import type { GameState } from '../../lib/gameLogic'
import CardComponent from '../Card'
import { S } from './GameStyles'

interface LoseInfluenceOverlayProps {
  gameState: GameState
  myId: string
  onLose: (cardIndex: number) => void
}

export default function LoseInfluenceOverlay({ gameState, myId, onLose }: LoseInfluenceOverlayProps) {
  const myPlayer = gameState.players.find(p => p.userId === myId)
  if (!myPlayer) return null

  return (
    <div style={S.overlay}>
      <div className="chamfer-md fade-in" style={{ background: '#1c1b1b', padding: 24, width: '100%', maxWidth: 360, borderLeft: '2px solid #93000a', textAlign: 'center' }}>
        <div style={{ fontSize: 9, ...S.mono, color: '#93000a', letterSpacing: '0.25em', marginBottom: 4 }}>DIRECTIVE</div>
        <h3 style={{ ...S.serif, fontSize: 22, color: '#ffb4ab', margin: '0 0 4px' }}>Surrender Influence</h3>
        <p style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.15em', margin: '0 0 20px', ...S.mono }}>SELECT IDENTITY TO REVEAL</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {myPlayer.cards.map((card, i) => !card.revealed ? (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="influence-card selectable" style={{ width: 96, height: 144 }} onClick={() => onLose(i)}>
                <CardComponent card={card} size="md" alwaysShow selectable onClick={() => onLose(i)} />
              </div>
              <span style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.1em', ...S.mono }}>{card.character.toUpperCase()}</span>
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  )
}
