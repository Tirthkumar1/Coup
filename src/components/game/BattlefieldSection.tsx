import type { GameState, ActionType, Character } from '../../lib/gameLogic'
import { canReversal, canPassIn } from '../../lib/gameLogic'
import { S, BLOCK_OPTIONS } from './GameStyles'

interface BattlefieldSectionProps {
  gameState: GameState
  nameMap: Record<string, string>
  myId: string
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
  gameState, nameMap, myId,
  iCanChallenge, iCanBlock, blockCharPicker, setBlockCharPicker,
  loading, error, onClearError, onAction,
}: BattlefieldSectionProps) {
  const pending = gameState.pendingAction
  const phase = gameState.phase
  const isActor = pending?.actorId === myId

  const REACTION_PHASES = [
    'challenge_window', 'block_window',
    'reversal_window', 'block_challenge_window',
  ]
  if (!REACTION_PHASES.includes(phase)) return null

  const blockOpts = (pending ? (BLOCK_OPTIONS[pending.action] ?? []) : []) as Character[]

  const iCanReversal = canReversal(gameState, myId)
  const iCanPass = canPassIn(gameState, myId)

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

  // In reversal_window, show a simplified actor-only UI
  if (phase === 'reversal_window') {
    return (
      <div className="fade-in" style={{
        background: 'rgba(246,190,59,.04)',
        borderTop: '1px solid rgba(246,190,59,.25)',
        borderBottom: '1px solid rgba(246,190,59,.25)',
        padding: '16px 16px', textAlign: 'center', flexShrink: 0,
      }}>
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ ...S.serif, fontSize: 16, color: '#e5e2e1', margin: '0 0 3px' }}>
            {nameMap[pending?.blockerId ?? '']?.toUpperCase() ?? '?'} BLOCKS AS {pending?.blockerCharacter?.toUpperCase()}
          </h2>
          <p style={{ fontSize: 9, color: '#f6be3b', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, ...S.mono }}>
            {isActor ? 'ACCEPT BLOCK OR ALLOW CHALLENGE' : 'WAITING FOR ACTOR…'}
          </p>
        </div>
        {isActor && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {iCanReversal && (
              <button className="react-btn pass" onClick={() => onAction('reversal')} disabled={loading}>
                ACCEPT BLOCK
              </button>
            )}
            {iCanPass && (
              <button className="react-btn challenge" onClick={() => onAction('pass')} disabled={loading}>
                ALLOW CHALLENGE
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fade-in" style={{
      background: 'rgba(200,8,21,.05)',
      borderTop: '1px solid rgba(200,8,21,.3)',
      borderBottom: '1px solid rgba(200,8,21,.3)',
      padding: '18px 16px', textAlign: 'center',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04, fontSize: 140, color: '#c80815', pointerEvents: 'none', userSelect: 'none' }}>◈</div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-block', borderTop: '1px solid rgba(200,8,21,.35)', borderBottom: '1px solid rgba(200,8,21,.35)', padding: '8px 20px', marginBottom: 12 }}>
          <h2 style={{ ...S.serif, fontSize: 18, color: '#e5e2e1', margin: 0 }}>{pendingLabel}</h2>
          <p style={{ fontSize: 9, color: '#c80815', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '4px 0 0', ...S.mono }}>
            {pending?.targetId ? `TARGET: ${nameMap[pending.targetId]?.toUpperCase() ?? '?'}` : 'PENDING COUNTER-MEASURES'}
          </p>
        </div>
        {error && (
          <div className="chamfer-sm" style={{ background: 'rgba(147,0,10,.2)', padding: '7px 14px', marginBottom: 10, fontSize: 10, color: '#ffb4ab', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={onClearError} style={{ background: 'none', border: 'none', color: '#c80815', cursor: 'pointer', marginLeft: 8 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {iCanChallenge && (
            <button className="react-btn challenge" onClick={() => onAction('challenge')} disabled={loading}>CHALLENGE</button>
          )}
          {iCanBlock && !blockCharPicker && (
            <button className="react-btn block" onClick={() => blockOpts.length === 1 ? onAction('block', undefined, blockOpts[0]) : setBlockCharPicker(true)} disabled={loading}>BLOCK</button>
          )}
          {blockCharPicker && blockOpts.map(ch => (
            <button key={ch} className="react-btn block" onClick={() => { onAction('block', undefined, ch); setBlockCharPicker(false) }} disabled={loading}>
              BLOCK AS {ch.toUpperCase()}
            </button>
          ))}
          {iCanPass && !isActor && (
            <button className="react-btn pass" onClick={() => onAction('pass')} disabled={loading}>PASS</button>
          )}
        </div>
      </div>
    </div>
  )
}
