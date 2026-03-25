import type { GameState, ActionType } from '../../lib/gameLogic'
import { S, ACTION_LABELS } from './GameStyles'

interface TargetPickerProps {
  gameState: GameState
  myId: string
  targetAction: ActionType
  onSelect: (action: ActionType, targetId: string) => void
  onCancel: () => void
}

export default function TargetPicker({ gameState, myId, targetAction, onSelect, onCancel }: TargetPickerProps) {
  return (
    <div style={S.overlay}>
      <div className="chamfer-md fade-in" style={{ background: '#1c1b1b', padding: 24, width: '100%', maxWidth: 340, borderLeft: '2px solid #c80815' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, ...S.mono, color: '#c80815', letterSpacing: '0.25em', marginBottom: 4 }}>OPERATION</div>
          <h3 style={{ ...S.serif, fontSize: 22, margin: 0, color: '#e5e2e1' }}>{ACTION_LABELS[targetAction]}</h3>
          <p style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.1em', margin: '4px 0 0', ...S.mono }}>SELECT TARGET OPERATIVE</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gameState.players.filter(p => p.userId !== myId && !p.isEliminated).map(p => (
            <button key={p.userId} className="target-row" onClick={() => onSelect(targetAction, p.userId)}>
              <div className="chamfer-sm" style={{ width: 30, height: 30, background: '#353534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#ad8883', flexShrink: 0 }}>
                {p.displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...S.serif, fontSize: 14 }}>{p.displayName}</div>
                <div style={{ fontSize: 9, color: '#5d3f3c', ...S.mono, letterSpacing: '0.1em' }}>{p.cards.filter(c => !c.revealed).length} INFLUENCE · {p.coins} GOLD</div>
              </div>
              <span style={{ color: '#c80815', fontSize: 14 }}>→</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="chamfer-sm" style={{ width: '100%', marginTop: 12, background: 'none', border: '1px solid #2a2a2a', color: '#5d3f3c', cursor: 'pointer', padding: 10, fontSize: 10, letterSpacing: '0.15em', fontFamily: 'Space Grotesk,sans-serif', textTransform: 'uppercase' }}>
          ABORT
        </button>
      </div>
    </div>
  )
}
