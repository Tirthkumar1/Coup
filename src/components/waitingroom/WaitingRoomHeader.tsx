import { styles, chamferSm } from './WaitingRoomStyles'

interface WaitingRoomHeaderProps {
  code: string | undefined
  copied: boolean
  onCopy: () => void
}

export default function WaitingRoomHeader({ code, copied, onCopy }: WaitingRoomHeaderProps) {
  return (
    <header style={{ background: 'rgba(14,14,14,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${styles.outlineVariant}26` }}
      className="flex justify-between items-center px-5 py-3 sticky top-0 z-50 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div style={{ color: styles.primaryContainer, fontSize: 18, fontFamily: 'Material Symbols Outlined' }}>terminal</div>
        <div>
          <div style={{ color: styles.primaryContainer, fontSize: 9, letterSpacing: '0.2em', fontWeight: 700 }} className="uppercase font-mono">
            OPERATION NOIR
          </div>
          <div style={{ color: styles.onSurface, fontSize: 11, letterSpacing: '0.15em', fontWeight: 700 }} className="uppercase">
            STAGING AREA
          </div>
        </div>
      </div>

      <button onClick={onCopy} style={{ ...chamferSm, background: styles.containerLowest, border: `1px solid ${styles.outlineVariant}`, padding: '4px 14px', cursor: 'pointer' }}
        className="flex items-center gap-2 transition-all">
        <span style={{ color: styles.onSurfaceVar, fontSize: 9, fontFamily: 'Inter', letterSpacing: '0.1em' }} className="uppercase">Session</span>
        <span style={{ color: styles.secondary, fontFamily: 'Inter', fontSize: 13, letterSpacing: '0.25em', fontWeight: 700 }}>
          {code}
        </span>
        <span style={{ color: copied ? styles.secondary : styles.outlineVariant, fontSize: 9, fontFamily: 'Inter' }}>
          {copied ? '✓ COPIED' : 'COPY'}
        </span>
      </button>
    </header>
  )
}
