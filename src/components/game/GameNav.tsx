import type { ActionType } from '../../lib/gameLogic'

interface GameNavProps {
  showLog: boolean
  isMyTurn: boolean
  validActions: ActionType[]
  loading: boolean
  onToggleLog: () => void
  onAction: (action: ActionType) => void
  onTargetAction: (action: ActionType) => void
}

export default function GameNav({
  showLog, isMyTurn, validActions, loading,
  onToggleLog, onAction, onTargetAction,
}: GameNavProps) {
  const canDo = (action: ActionType) => isMyTurn && validActions.includes(action) && !loading

  const navBtnStyle = (active = false, disabled = false): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '6px 8px', fontFamily: 'Space Grotesk,sans-serif',
    opacity: disabled ? 0.35 : 1, transition: 'opacity 0.15s',
    color: active ? '#f6be3b' : '#5d3f3c',
  })

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '6px 8px 10px',
      background: 'rgba(10,10,10,0.82)',
      backdropFilter: 'blur(14px)',
      boxShadow: '0 -10px 30px rgba(139,0,0,0.12)',
      borderTop: '1px solid rgba(139,0,0,0.18)',
      borderRadius: '14px 14px 0 0',
    }}>
      {/* Income */}
      <button style={navBtnStyle(false, !canDo('income'))} onClick={() => canDo('income') && onAction('income')}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: canDo('income') ? '#5d3f3c' : '#2a2a2a' }}>payments</span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Income</span>
      </button>

      {/* Foreign Aid */}
      <button style={navBtnStyle(false, !canDo('foreign_aid'))} onClick={() => canDo('foreign_aid') && onAction('foreign_aid')}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: canDo('foreign_aid') ? '#5d3f3c' : '#2a2a2a' }}>public</span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Foreign Aid</span>
      </button>

      {/* Tax */}
      <button style={navBtnStyle(false, !canDo('tax'))} onClick={() => canDo('tax') && onAction('tax')}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: canDo('tax') ? '#5d3f3c' : '#2a2a2a' }}>toll</span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Tax</span>
      </button>

      {/* Coup — highlighted */}
      <button
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: canDo('coup') ? 'linear-gradient(to bottom, #7f1d1d, #450a0a)' : 'transparent',
          border: 'none', borderRadius: 8, padding: '6px 10px',
          cursor: canDo('coup') ? 'pointer' : 'not-allowed',
          opacity: canDo('coup') ? 1 : 0.35,
          transition: 'all 0.15s', fontFamily: 'Space Grotesk,sans-serif',
        }}
        onClick={() => canDo('coup') && onTargetAction('coup')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: canDo('coup') ? '#f6be3b' : '#2a2a2a' }}>gavel</span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: canDo('coup') ? '#f6be3b' : '#2a2a2a' }}>Coup</span>
      </button>

      {/* Intel / Log */}
      <button style={navBtnStyle(showLog)} onClick={onToggleLog}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: showLog ? '#f6be3b' : '#5d3f3c' }}>menu</span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Intel</span>
      </button>
    </nav>
  )
}
