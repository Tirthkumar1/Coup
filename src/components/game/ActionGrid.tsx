import type { ActionType } from '../../lib/gameLogic'

interface ActionGridProps {
  validActions: ActionType[]
  loading: boolean
  error: string
  onClearError: () => void
  onAction: (action: ActionType) => void
  onTargetAction: (action: ActionType) => void
}

export default function ActionGrid({ validActions, loading, error, onClearError, onAction, onTargetAction }: ActionGridProps) {
  return (
    <div className="fade-in">
      {error && (
        <div className="chamfer-sm" style={{ background: 'rgba(147,0,10,.15)', padding: '8px 12px', marginBottom: 8, fontSize: 10, color: '#ffb4ab', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={onClearError} style={{ background: 'none', border: 'none', color: '#c80815', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
        <button className="action-btn" disabled={!validActions.includes('income') || loading} onClick={() => onAction('income')}>INCOME</button>
        <button className="action-btn" disabled={!validActions.includes('foreign_aid') || loading} onClick={() => onAction('foreign_aid')}>FOREIGN AID</button>
        <button className="action-btn" disabled={!validActions.includes('tax') || loading} onClick={() => onAction('tax')}>TAX</button>
        <button className="action-btn" disabled={!validActions.includes('steal') || loading} onClick={() => onTargetAction('steal')}>STEAL</button>
        <button className="action-btn primary" style={{ gridColumn: 'span 2' }} disabled={!validActions.includes('assassinate') || loading} onClick={() => onTargetAction('assassinate')}>ASSASSINATE</button>
        <button className="action-btn" disabled={!validActions.includes('exchange') || loading} onClick={() => onAction('exchange')}>EXCHANGE</button>
        <button className="action-btn danger" disabled={!validActions.includes('coup') || loading} onClick={() => onTargetAction('coup')}>COUP</button>
      </div>
    </div>
  )
}
