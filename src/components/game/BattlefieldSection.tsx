import type { GameState, ActionType, Character } from '../../lib/gameLogic'
import { S, BLOCK_OPTIONS } from './GameStyles'

interface BattlefieldSectionProps {
  gameState: GameState
  nameMap: Record<string, string>
  isMyTurn: boolean
  iCanChallenge: boolean
  iCanBlock: boolean
  blockCharPicker: boolean
  setBlockCharPicker: (v: boolean) => void
  loading: boolean
  error: string
  onClearError: () => void
  onAction: (action: ActionType, targetId?: string, character?: Character) => void
}

export default function BattlefieldSection({
  gameState, nameMap, isMyTurn,
  iCanChallenge, iCanBlock, blockCharPicker, setBlockCharPicker,
  loading, error, onClearError, onAction,
}: BattlefieldSectionProps) {
  const pending = gameState.pendingAction
  const showReact = ['challenge_window', 'block_window', 'block_challenge_window'].includes(gameState.phase)
  const blockOpts = (pending ? (BLOCK_OPTIONS[pending.action] ?? []) : []) as Character[]

  const pendingLabel = pending?.blockerId
    ? `${nameMap[pending.blockerId]?.toUpperCase() ?? '?'} BLOCKS AS ${pending.blockerCharacter?.toUpperCase()}`
    : `${nameMap[pending?.actorId ?? '']?.toUpperCase() ?? '?'} CLAIMS ${
        pending?.action === 'tax' ? 'DUKE'
        : pending?.action === 'assassinate' ? 'ASSASSIN'
        : pending?.action === 'steal' ? 'CAPTAIN'
        : pending?.action === 'exchange' ? 'AMBASSADOR'
        : pending?.action === 'foreign_aid' ? 'FOREIGN AID'
        : (pending?.action ?? '').toUpperCase()
      }`

  if (showReact) {
    return (
      <div className="fade-in" style={{ background: 'rgba(200,8,21,.04)', borderTop: '1px solid rgba(200,8,21,.3)', borderBottom: '1px solid rgba(200,8,21,.3)', padding: '22px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04, fontSize: 160, color: '#c80815', pointerEvents: 'none', userSelect: 'none' }}>◈</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', borderTop: '1px solid rgba(200,8,21,.35)', borderBottom: '1px solid rgba(200,8,21,.35)', padding: '10px 24px', marginBottom: 14 }}>
            <h2 style={{ ...S.serif, fontSize: 20, color: '#e5e2e1', margin: 0 }}>{pendingLabel}</h2>
            <p style={{ fontSize: 9, color: '#c80815', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '4px 0 0', ...S.mono }}>
              {pending?.targetId ? `TARGET: ${nameMap[pending.targetId]?.toUpperCase() ?? '?'}` : 'PENDING COUNTER-MEASURES'}
            </p>
          </div>
          {error && (
            <div className="chamfer-sm" style={{ background: 'rgba(147,0,10,.2)', padding: '8px 16px', marginBottom: 12, fontSize: 10, color: '#ffb4ab', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{error}</span>
              <button onClick={onClearError} style={{ background: 'none', border: 'none', color: '#c80815', cursor: 'pointer', marginLeft: 8 }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {iCanChallenge && <button className="react-btn challenge" onClick={() => onAction('challenge')} disabled={loading}>CHALLENGE</button>}
            {iCanBlock && !blockCharPicker && (
              <button className="react-btn block" onClick={() => blockOpts.length === 1 ? onAction('block', undefined, blockOpts[0]) : setBlockCharPicker(true)} disabled={loading}>BLOCK</button>
            )}
            {blockCharPicker && blockOpts.map(ch => (
              <button key={ch} className="react-btn block" onClick={() => { onAction('block', undefined, ch); setBlockCharPicker(false) }} disabled={loading}>
                BLOCK AS {ch.toUpperCase()}
              </button>
            ))}
            <button className="react-btn pass" onClick={() => onAction('pass')} disabled={loading}>PASS</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '14px 0', position: 'relative' }}>
      {isMyTurn && gameState.phase === 'player_turn' ? (
        <div className="fade-in" style={{ display: 'inline-block', borderTop: '1px solid rgba(246,190,59,.3)', borderBottom: '1px solid rgba(246,190,59,.3)', padding: '8px 24px' }}>
          <p style={{ ...S.serif, fontSize: 17, color: '#f6be3b', margin: 0 }}>Your Move</p>
          <p style={{ fontSize: 9, color: '#5d3f3c', letterSpacing: '0.2em', margin: '2px 0 0', ...S.mono }}>SELECT AN OPERATION BELOW</p>
        </div>
      ) : (
        <div style={{ display: 'inline-block', borderTop: '1px solid #2a2a2a', borderBottom: '1px solid #2a2a2a', padding: '8px 24px' }}>
          <p style={{ ...S.serif, fontSize: 16, color: '#5d3f3c', margin: 0 }}>{nameMap[gameState.currentTurnUserId] ?? '…'}</p>
          <p style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: '0.2em', margin: '2px 0 0', ...S.mono }}>AWAITING OPERATIVE</p>
        </div>
      )}
      {loading && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 48, height: 1, background: 'linear-gradient(90deg,transparent,#c80815,transparent)' }} />}
    </div>
  )
}
