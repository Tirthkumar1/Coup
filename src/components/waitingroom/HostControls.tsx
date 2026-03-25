import { styles, chamferBtn, chamferMd } from './WaitingRoomStyles'

interface HostControlsProps {
  code: string | undefined
  playerCount: number
  canStart: boolean
  loading: boolean
  onAddBot: () => void
  onStartGame: () => void
}

export default function HostControls({ code, playerCount, canStart, loading, onAddBot, onStartGame }: HostControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <button onClick={onAddBot} disabled={playerCount >= 6 || loading}
        className="btn-secondary transition-all"
        style={{ ...chamferBtn, background: 'transparent', border: `1px solid ${styles.outlineVariant}`, color: styles.onSurfaceVar, padding: '14px', fontSize: 10, fontFamily: 'Inter', letterSpacing: '0.2em', fontWeight: 700, cursor: playerCount >= 6 ? 'not-allowed' : 'pointer', opacity: playerCount >= 6 ? 0.4 : 1 }}>
        + DEPLOY AI OPERATIVE
      </button>

      <button onClick={onStartGame} disabled={!canStart || loading}
        className="btn-primary transition-all"
        style={{ ...chamferBtn, background: canStart ? styles.primaryContainer : styles.containerHigh, color: canStart ? '#ffd7d2' : styles.onSurfaceVar, padding: '16px', fontSize: 11, fontFamily: 'Inter', letterSpacing: '0.25em', fontWeight: 700, cursor: !canStart ? 'not-allowed' : 'pointer', opacity: !canStart ? 0.5 : 1 }}>
        {loading ? (
          <span>INITIALIZING<span className="blink">_</span></span>
        ) : canStart ? (
          `▶  INITIATE OPERATION  //  ${playerCount} OPERATIVES`
        ) : (
          `REQUIRES ${2 - playerCount} MORE OPERATIVE${2 - playerCount !== 1 ? 'S' : ''}`
        )}
      </button>

      <div className="flex items-center gap-3 my-2">
        <div style={{ flex: 1, height: 1, background: `${styles.outlineVariant}30` }} />
        <span style={{ color: styles.outlineVariant, fontSize: 9, fontFamily: 'Inter', letterSpacing: '0.15em' }} className="uppercase">Share access code</span>
        <div style={{ flex: 1, height: 1, background: `${styles.outlineVariant}30` }} />
      </div>

      <div style={{ background: styles.containerLowest, border: `1px solid ${styles.outlineVariant}40`, padding: '16px', ...chamferMd, textAlign: 'center' }}>
        <div style={{ color: styles.onSurfaceVar, fontSize: 9, fontFamily: 'Inter', letterSpacing: '0.2em', marginBottom: 8 }} className="uppercase">
          Operative Access Code
        </div>
        <div style={{ fontFamily: 'Inter', fontSize: 36, fontWeight: 700, color: styles.secondary, letterSpacing: '0.5em' }}>
          {code}
        </div>
        <div style={{ color: styles.outlineVariant, fontSize: 9, fontFamily: 'Inter', marginTop: 6 }}>
          Share with other operatives to join this operation
        </div>
      </div>
    </div>
  )
}
