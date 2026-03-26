import { useState } from 'react'
import type { GameState } from '../../lib/gameLogic'
import CardComponent from '../Card'
import { S } from './GameStyles'

interface ExchangeChoiceOverlayProps {
  gameState: GameState
  myId: string
  onChoose: (keepIndices: number[]) => void
}

export default function ExchangeChoiceOverlay({ gameState, myId, onChoose }: ExchangeChoiceOverlayProps) {
  const myPlayer = gameState.players.find(p => p.userId === myId)
  const [selected, setSelected] = useState<number[]>([])

  if (!myPlayer) return null

  const mustKeep = gameState.pendingAction?.exchangeKeepCount ?? 2

  const toggle = (i: number) => {
    setSelected(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : prev.length < mustKeep ? [...prev, i] : prev
    )
  }

  const canConfirm = selected.length === mustKeep

  return (
    <div style={S.overlay}>
      <div className="chamfer-md fade-in" style={{ background: '#1c1b1b', padding: 24, width: '100%', maxWidth: 420, borderLeft: '2px solid #f6be3b', textAlign: 'center' }}>
        <div style={{ fontSize: 9, ...S.mono, color: '#f6be3b', letterSpacing: '0.25em', marginBottom: 4 }}>AMBASSADOR EXCHANGE</div>
        <h3 style={{ ...S.serif, fontSize: 22, color: '#e5e2e1', margin: '0 0 4px' }}>Choose 2 to Keep</h3>
        <p style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.15em', margin: '0 0 20px', ...S.mono }}>
          SELECT {mustKeep} {mustKeep === 1 ? 'IDENTITY' : 'IDENTITIES'} — THE REST RETURN TO DECK
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {myPlayer.cards.map((card, i) => {
            if (card.revealed) return null
            const isSelected = selected.includes(i)
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  className={`influence-card selectable${isSelected ? ' selected' : ''}`}
                  style={{
                    width: 96, height: 144,
                    border: isSelected ? '2px solid #f6be3b' : '1px solid rgba(200,8,21,.4)',
                    boxShadow: isSelected ? '0 0 12px rgba(246,190,59,.4)' : undefined,
                    opacity: !isSelected && selected.length === 2 ? 0.4 : 1,
                  }}
                >
                  <CardComponent card={card} size="md" alwaysShow selectable onClick={() => toggle(i)} />
                </div>
                <span style={{ fontSize: 9, color: isSelected ? '#f6be3b' : '#5d3f3c', letterSpacing: '0.1em', ...S.mono }}>
                  {card.character.toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>
        <button
          className="react-btn"
          style={{ opacity: canConfirm ? 1 : 0.4, cursor: canConfirm ? 'pointer' : 'not-allowed', background: 'rgba(246,190,59,.15)', borderColor: 'rgba(246,190,59,.5)', color: '#f6be3b' }}
          disabled={!canConfirm}
          onClick={() => canConfirm && onChoose(selected)}
        >
          CONFIRM SELECTION ({selected.length}/{mustKeep})
        </button>
      </div>
    </div>
  )
}
